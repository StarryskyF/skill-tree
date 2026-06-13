import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SkillNode, SkillTree, SkillTreeDocument } from './schemas/skill-tree.schema';
import { CreateSkillTreeDto, type AppLanguage } from './dto/create-skill-tree.dto';
import { AiService, QuizQuestion } from '../ai/ai.service';
import { CompleteNodeDto } from './dto/complete-node.dto';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';
import { analyzePathSimilarity, PathAnalysisResult } from './path-analysis.util';
import { EvaluationService } from '../evaluation/evaluation.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Injectable()
export class SkillTreesService {
  private readonly logger = new Logger(SkillTreesService.name);

  constructor(
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
    private aiService: AiService,
    private ragService: RagService,
    private usersService: UsersService,
    private evaluationService: EvaluationService,
  ) {}

  async create(userId: string, dto: CreateSkillTreeDto, file?: Express.Multer.File): Promise<SkillTreeDocument> {
    const skillTree = await this.skillTreeModel.create({
      userId,
      goal: dto.goal,
      currentLevel: dto.currentLevel,
      language: dto.language ?? 'zh-CN',
      status: 'generating',
    });

    this.logger.log(`Skill tree created (id=${skillTree.id}), starting async generation`);
    await this.logEvaluation({
      userId,
      skillTreeId: skillTree.id as string,
      type: 'tree_created',
      metadata: { goal: dto.goal, currentLevel: dto.currentLevel, hasFile: Boolean(file) },
    });

    let hasPdf = false;
    if (file) {
      try {
        const parsed = await pdfParse(file.buffer);
        const text = parsed.text.replace(/\s+/g, ' ').trim();
        const chunks: string[] = [];
        for (let i = 0; i < text.length && chunks.length < 20; i += 800) {
          const chunk = text.slice(i, i + 800).trim();
          if (chunk.length > 50) chunks.push(chunk);
        }
        await this.ragService.storeDocument(userId, skillTree.id as string, chunks);
        hasPdf = true;
        this.logger.log(`PDF processed: ${chunks.length} chunks stored for skillTree ${skillTree.id}`);
      } catch (err) {
        this.logger.error(`PDF parse failed: ${(err as Error).message}`);
      }
    }

    setImmediate(() =>
      this.runGeneration(skillTree.id as string, userId, dto.goal, dto.currentLevel, hasPdf, dto.language ?? 'zh-CN'),
    );

    return skillTree;
  }

  private async runGeneration(
    id: string,
    userId: string,
    goal: string,
    currentLevel: string,
    hasPdf: boolean,
    language: AppLanguage,
  ) {
    try {
      let documentContext: string | undefined;
      if (hasPdf) {
        const chunks = await this.ragService.searchDocuments(userId, id, goal, 5);
        if (chunks.length > 0) documentContext = chunks.join('\n\n');
      }
      const result = await this.aiService.generateSkillTree(goal, currentLevel, documentContext, language);
      await this.skillTreeModel.findByIdAndUpdate(id, {
        status: 'ready',
        title: result.title,
        nodes: result.nodes,
        edges: result.edges,
      });
      await this.logEvaluation({
        userId,
        skillTreeId: id,
        type: 'tree_ready',
        metadata: { nodeCount: result.nodes.length, edgeCount: result.edges.length, hasPdf },
      });
      this.logger.log(`Skill tree generation done (id=${id})`);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Skill tree generation failed (id=${id}): ${message}`);
      await this.skillTreeModel.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: message,
      });
      await this.logEvaluation({
        userId,
        skillTreeId: id,
        type: 'tree_failed',
        metadata: { message, hasPdf },
      });
    }
  }

  async findAll(userId: string): Promise<SkillTreeDocument[]> {
    return this.skillTreeModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<SkillTreeDocument> {
    const doc = await this.skillTreeModel.findOne({ _id: id, userId }).exec();
    if (!doc) throw new NotFoundException('技能树不存在');
    return doc;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.skillTreeModel.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('技能树不存在');
    this.logger.log(`Skill tree deleted (id=${id})`);
  }

  private computeNodeStatuses(
    nodes: SkillNode[],
    completedNodes: string[],
  ): Record<string, 'locked' | 'available' | 'completed'> {
    const completedSet = new Set(completedNodes);
    const statuses: Record<string, 'locked' | 'available' | 'completed'> = {};
    for (const node of nodes) {
      if (completedSet.has(node.id)) {
        statuses[node.id] = 'completed';
      } else if (node.prerequisites.every((p) => completedSet.has(p))) {
        statuses[node.id] = 'available';
      } else {
        statuses[node.id] = 'locked';
      }
    }
    return statuses;
  }

  async getNodeStatuses(
    userId: string,
    treeId: string,
  ): Promise<Record<string, 'locked' | 'available' | 'completed'>> {
    const tree = await this.findOne(userId, treeId);
    return this.computeNodeStatuses(tree.nodes, tree.completedNodes ?? []);
  }

  async generateNodeQuiz(
    userId: string,
    treeId: string,
    nodeId: string,
    language?: AppLanguage,
  ): Promise<QuizQuestion[]> {
    const tree = await this.findOne(userId, treeId);
    const node = tree.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException('节点不存在');

    const statuses = this.computeNodeStatuses(tree.nodes, tree.completedNodes ?? []);
    if (statuses[nodeId] === 'locked') throw new ForbiddenException('该节点尚未解锁');
    if (statuses[nodeId] === 'completed') throw new BadRequestException('该节点已完成');

    return this.aiService.generateQuiz(node.title, node.description, tree.goal, language ?? tree.language ?? 'zh-CN');
  }

  async completeNode(
    userId: string,
    treeId: string,
    nodeId: string,
    dto: CompleteNodeDto,
  ): Promise<{
    passed: boolean;
    score: number;
    newStatuses: Record<string, 'locked' | 'available' | 'completed'>;
    expGained?: number;
    newExp?: number;
    newLevel?: number;
    leveledUp?: boolean;
    newBadges?: Array<{ id: string; name: string }>;
  }> {
    const tree = await this.findOne(userId, treeId);
    const node = tree.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException('节点不存在');

    const statuses = this.computeNodeStatuses(tree.nodes, tree.completedNodes ?? []);
    if (statuses[nodeId] === 'locked') throw new ForbiddenException('该节点尚未解锁');
    if (statuses[nodeId] === 'completed') throw new BadRequestException('该节点已完成');

    let correct = 0;
    const mistakes: { question: string; userAnswer: string; correctAnswer: string }[] = [];
    for (let i = 0; i < dto.questions.length; i++) {
      if (dto.quizAnswers[i] === dto.questions[i].correctIndex) {
        correct++;
      } else {
        mistakes.push({
          question: dto.questions[i].question,
          userAnswer: dto.questions[i].options[dto.quizAnswers[i]] ?? '未作答',
          correctAnswer: dto.questions[i].options[dto.questions[i].correctIndex],
        });
      }
    }
    const score = correct;
    const passed = score >= 2;
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: passed ? 'quiz_passed' : 'quiz_failed',
      score,
      metadata: { questionCount: dto.questions.length, mistakeCount: mistakes.length },
    });

    // 无论通过与否，都存储本次错题
    if (mistakes.length > 0) {
      setImmediate(() =>
        this.ragService
          .storeQuizMistakes(userId, treeId, nodeId, node.title, mistakes)
          .catch((err) => this.logger.error(`RAG store failed: ${(err as Error).message}`)),
      );
    }

    if (!passed) {
      return { passed: false, score, newStatuses: statuses };
    }

    const updatedCompletedNodes = [...new Set([...(tree.completedNodes ?? []), nodeId])];
    await this.skillTreeModel.findByIdAndUpdate(treeId, { completedNodes: updatedCompletedNodes });
    this.logger.log(`Node completed (treeId=${treeId}, nodeId=${nodeId})`);
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: 'node_completed',
      score,
      metadata: { completedCount: updatedCompletedNodes.length, totalCount: tree.nodes.length },
    });

    const newStatuses = this.computeNodeStatuses(tree.nodes, updatedCompletedNodes);

    // 检查是否完成整棵树
    const treeComplete = tree.nodes.every((n) => updatedCompletedNodes.includes(n.id));
    const treeBadges = treeComplete
      ? [{ id: `tree_complete_${treeId}`, name: `🎓「${tree.title}」完成者` }]
      : [];

    const expGained = node.exp ?? 10;
    const { newExp, newLevel, leveledUp, newBadges } = await this.usersService.addExp(userId, expGained, treeBadges);
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: 'exp_gained',
      exp: expGained,
      metadata: { newExp, newLevel, leveledUp },
    });
    for (const badge of newBadges) {
      await this.logEvaluation({
        userId,
        skillTreeId: treeId,
        nodeId,
        type: 'badge_unlocked',
        metadata: badge,
      });
    }

    return { passed: true, score, newStatuses, expGained, newExp, newLevel, leveledUp, newBadges };
  }

  async getPathAnalysis(userId: string, treeId: string): Promise<PathAnalysisResult> {
    const tree = await this.findOne(userId, treeId);
    return analyzePathSimilarity(tree.nodes, tree.completedNodes ?? []);
  }

  private async logEvaluation(input: Parameters<EvaluationService['recordEvent']>[0]) {
    try {
      await this.evaluationService.recordEvent(input);
    } catch (err) {
      this.logger.warn(`Evaluation event skipped: ${(err as Error).message}`);
    }
  }
}
