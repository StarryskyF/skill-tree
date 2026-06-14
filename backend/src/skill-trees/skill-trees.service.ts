import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { NodeQuizPerformance, PendingQuizSession, SkillNode, SkillTree, SkillTreeDocument } from './schemas/skill-tree.schema';
import { CreateSkillTreeDto, type AppLanguage } from './dto/create-skill-tree.dto';
import { AiService, QuizQuestion } from '../ai/ai.service';
import { CompleteNodeDto } from './dto/complete-node.dto';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';
import { analyzePathSimilarity, calculatePathRewardBonus, PathAnalysisResult } from './path-analysis.util';
import { EvaluationService } from '../evaluation/evaluation.service';
import { validateAndNormalizeSkillTree } from './skill-tree-validation.util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface NodeQuizSession {
  quizSessionId: string;
  questions: QuizQuestion[];
}

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
        const text = (await extractPdfText(file.buffer)).replace(/\s+/g, ' ').trim();
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

      const maxGenerationAttempts = 3;
      let result: Awaited<ReturnType<AiService['generateSkillTree']>> | undefined;
      for (let attempt = 1; attempt <= maxGenerationAttempts; attempt++) {
        try {
          const generated = await this.aiService.generateSkillTree(goal, currentLevel, documentContext, language);
          result = validateAndNormalizeSkillTree(generated);
          break;
        } catch (err) {
          this.logger.warn(
            `Skill tree structural validation failed (id=${id}, attempt ${attempt}/${maxGenerationAttempts}): ${(err as Error).message}`,
          );
          if (attempt === maxGenerationAttempts) throw err;
        }
      }

      if (!result) throw new Error('Skill tree generation did not produce a result');
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
  ): Promise<NodeQuizSession> {
    const tree = await this.findOne(userId, treeId);
    const node = tree.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException('节点不存在');

    const statuses = this.computeNodeStatuses(tree.nodes, tree.completedNodes ?? []);
    if (statuses[nodeId] === 'locked') throw new ForbiddenException('该节点尚未解锁');
    if (statuses[nodeId] === 'completed') throw new BadRequestException('该节点已完成');

    const memory = await this.ragService.searchLearningMemory({
      userId,
      skillTreeId: treeId,
      query: `${node.title}\n${node.description}`,
      mistakeLimit: 3,
      documentLimit: 3,
    });
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: 'rag_retrieved',
      metadata: {
        interaction: 'quiz_generation',
        queryLength: node.title.length + node.description.length,
        mistakeHits: memory.mistakes.length,
        documentHits: memory.documents.length,
        totalHits: memory.totalHits,
        sourceTypes: [
          ...(memory.mistakes.length > 0 ? ['mistake'] : []),
          ...(memory.documents.length > 0 ? ['document'] : []),
        ],
      },
    });

    const learningContext = buildLearningContext(memory.mistakes.map((item) => item.content), memory.documents.map((item) => item.content));
    const questions = await this.aiService.generateQuiz(
      node.title,
      node.description,
      tree.goal,
      language ?? tree.language ?? 'zh-CN',
      learningContext,
    );
    const quizSessionId = randomUUID();
    const pendingQuizSessions = pruneQuizSessions(tree.pendingQuizSessions ?? [], nodeId);
    pendingQuizSessions.push({ id: quizSessionId, nodeId, questions, createdAt: new Date() });
    await this.skillTreeModel.findByIdAndUpdate(treeId, { pendingQuizSessions });
    return { quizSessionId, questions };
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
    baseExp?: number;
    pathBonusExp?: number;
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

    const quizSession = findQuizSession(tree.pendingQuizSessions ?? [], dto.quizSessionId, nodeId);
    if (!quizSession) {
      throw new BadRequestException('Quiz session expired. Please generate a new quiz.');
    }

    let correct = 0;
    const mistakes: { question: string; userAnswer: string; correctAnswer: string }[] = [];
    for (let i = 0; i < quizSession.questions.length; i++) {
      const question = quizSession.questions[i];
      if (dto.quizAnswers[i] === question.correctIndex) {
        correct++;
      } else {
        mistakes.push({
          question: question.question,
          userAnswer: question.options[dto.quizAnswers[i]] ?? '未作答',
          correctAnswer: question.options[question.correctIndex],
        });
      }
    }
    const score = correct;
    const passed = score >= 2;
    const remainingQuizSessions = removeQuizSession(tree.pendingQuizSessions ?? [], dto.quizSessionId);
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: passed ? 'quiz_passed' : 'quiz_failed',
      score,
      metadata: { questionCount: quizSession.questions.length, mistakeCount: mistakes.length },
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
      const quizPerformance = updateQuizPerformance(tree.quizPerformance ?? [], nodeId, score, false);
      await this.skillTreeModel.findByIdAndUpdate(treeId, { quizPerformance, pendingQuizSessions: remainingQuizSessions });
      return { passed: false, score, newStatuses: statuses };
    }

    const updatedCompletedNodes = [...new Set([...(tree.completedNodes ?? []), nodeId])];
    const quizPerformance = updateQuizPerformance(tree.quizPerformance ?? [], nodeId, score, true);
    await this.skillTreeModel.findByIdAndUpdate(treeId, {
      completedNodes: updatedCompletedNodes,
      quizPerformance,
      pendingQuizSessions: remainingQuizSessions,
    });
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

    const pathReward = calculatePathRewardBonus(tree.nodes, tree.completedNodes ?? [], nodeId);
    const afterPath = analyzePathSimilarity(tree.nodes, updatedCompletedNodes, quizPerformance);

    // 检查是否完成整棵树，并把明显的学习成就转成徽章反馈。
    const treeComplete = tree.nodes.every((n) => updatedCompletedNodes.includes(n.id));
    const treeBadges = [
      ...(treeComplete ? [{ id: `tree_complete_${treeId}`, name: `完成整棵树：${tree.title}` }] : []),
      ...(afterPath.similarityScore >= 80 ? [{ id: `high_similarity_path_${treeId}`, name: '高相似度路径' }] : []),
      ...(score === quizSession.questions.length ? [{ id: 'perfect_quiz', name: '测验全对' }] : []),
    ];

    const expGained = pathReward.totalExp;
    const { newExp, newLevel, leveledUp, newBadges } = await this.usersService.addExp(userId, expGained, treeBadges);
    await this.logEvaluation({
      userId,
      skillTreeId: treeId,
      nodeId,
      type: 'exp_gained',
      exp: expGained,
      metadata: {
        baseExp: pathReward.baseExp,
        pathBonusExp: pathReward.bonusExp,
        pathBonusReason: pathReward.reason,
        similarityScoreAfter: pathReward.similarityScoreAfter,
        newExp,
        newLevel,
        leveledUp,
      },
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

    return {
      passed: true,
      score,
      newStatuses,
      expGained,
      baseExp: pathReward.baseExp,
      pathBonusExp: pathReward.bonusExp,
      newExp,
      newLevel,
      leveledUp,
      newBadges,
    };
  }

  async getPathAnalysis(userId: string, treeId: string): Promise<PathAnalysisResult> {
    const tree = await this.findOne(userId, treeId);
    return analyzePathSimilarity(tree.nodes, tree.completedNodes ?? [], tree.quizPerformance ?? []);
  }

  private async logEvaluation(input: Parameters<EvaluationService['recordEvent']>[0]) {
    try {
      await this.evaluationService.recordEvent(input);
    } catch (err) {
      this.logger.warn(`Evaluation event skipped: ${(err as Error).message}`);
    }
  }
}

function updateQuizPerformance(
  performances: NodeQuizPerformance[],
  nodeId: string,
  score: number,
  passed: boolean,
): NodeQuizPerformance[] {
  const now = new Date();
  const existing = performances.find((item) => item.nodeId === nodeId);
  const next: NodeQuizPerformance = {
    nodeId,
    attempts: (existing?.attempts ?? 0) + 1,
    passCount: (existing?.passCount ?? 0) + (passed ? 1 : 0),
    failCount: (existing?.failCount ?? 0) + (passed ? 0 : 1),
    consecutiveFailures: passed ? 0 : (existing?.consecutiveFailures ?? 0) + 1,
    lastScore: score,
    lastAttemptAt: now,
    lastPassedAt: passed ? now : existing?.lastPassedAt,
    lastFailedAt: passed ? existing?.lastFailedAt : now,
  };

  const others = performances.filter((item) => item.nodeId !== nodeId);
  return [...others, next];
}

function findQuizSession(
  sessions: PendingQuizSession[],
  quizSessionId: string,
  nodeId: string,
): PendingQuizSession | undefined {
  return sessions.find((session) => session.id === quizSessionId && session.nodeId === nodeId);
}

function removeQuizSession(sessions: PendingQuizSession[], quizSessionId: string): PendingQuizSession[] {
  return sessions.filter((session) => session.id !== quizSessionId);
}

function pruneQuizSessions(sessions: PendingQuizSession[], nodeId: string): PendingQuizSession[] {
  const cutoff = Date.now() - 30 * 60 * 1000;
  return sessions.filter((session) => {
    const createdAt = session.createdAt ? new Date(session.createdAt).getTime() : 0;
    return createdAt >= cutoff && session.nodeId !== nodeId;
  });
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  if (typeof pdfParse === 'function') {
    const parsed = await pdfParse(buffer);
    return parsed.text ?? '';
  }

  if (typeof pdfParse.PDFParse === 'function') {
    const parser = new pdfParse.PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text ?? '';
    } finally {
      await parser.destroy?.();
    }
  }

  throw new Error('Unsupported pdf-parse API');
}

function buildLearningContext(mistakes: string[], documents: string[]): string | undefined {
  const parts: string[] = [];
  if (mistakes.length > 0) {
    parts.push(`Past quiz mistakes:\n${mistakes.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  }
  if (documents.length > 0) {
    parts.push(`Uploaded reference snippets:\n${documents.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
  }
  return parts.length > 0 ? parts.join('\n\n') : undefined;
}
