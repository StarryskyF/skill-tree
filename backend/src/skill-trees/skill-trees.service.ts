import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SkillNode, SkillTree, SkillTreeDocument } from './schemas/skill-tree.schema';
import { CreateSkillTreeDto } from './dto/create-skill-tree.dto';
import { AiService, QuizQuestion } from '../ai/ai.service';
import { CompleteNodeDto } from './dto/complete-node.dto';
import { RagService } from '../rag/rag.service';

@Injectable()
export class SkillTreesService {
  private readonly logger = new Logger(SkillTreesService.name);

  constructor(
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
    private aiService: AiService,
    private ragService: RagService,
  ) {}

  async create(userId: string, dto: CreateSkillTreeDto): Promise<SkillTreeDocument> {
    const skillTree = await this.skillTreeModel.create({
      userId,
      goal: dto.goal,
      currentLevel: dto.currentLevel,
      status: 'generating',
    });

    this.logger.log(`Skill tree created (id=${skillTree.id}), starting async generation`);

    setImmediate(() => this.runGeneration(skillTree.id as string, dto.goal, dto.currentLevel));

    return skillTree;
  }

  private async runGeneration(id: string, goal: string, currentLevel: string) {
    try {
      const result = await this.aiService.generateSkillTree(goal, currentLevel);
      await this.skillTreeModel.findByIdAndUpdate(id, {
        status: 'ready',
        title: result.title,
        nodes: result.nodes,
        edges: result.edges,
      });
      this.logger.log(`Skill tree generation done (id=${id})`);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Skill tree generation failed (id=${id}): ${message}`);
      await this.skillTreeModel.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: message,
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
  ): Promise<QuizQuestion[]> {
    const tree = await this.findOne(userId, treeId);
    const node = tree.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException('节点不存在');

    const statuses = this.computeNodeStatuses(tree.nodes, tree.completedNodes ?? []);
    if (statuses[nodeId] === 'locked') throw new ForbiddenException('该节点尚未解锁');
    if (statuses[nodeId] === 'completed') throw new BadRequestException('该节点已完成');

    return this.aiService.generateQuiz(node.title, node.description);
  }

  async completeNode(
    userId: string,
    treeId: string,
    nodeId: string,
    dto: CompleteNodeDto,
  ): Promise<{ passed: boolean; score: number; newStatuses: Record<string, 'locked' | 'available' | 'completed'> }> {
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

    const newStatuses = this.computeNodeStatuses(tree.nodes, updatedCompletedNodes);
    return { passed: true, score, newStatuses };
  }
}
