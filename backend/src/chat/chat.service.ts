import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AiService } from '../ai/ai.service';
import { SkillTree, SkillTreeDocument } from '../skill-trees/schemas/skill-tree.schema';
import { RagService } from '../rag/rag.service';
import { analyzePathSimilarity } from '../skill-trees/path-analysis.util';
import type { AppLanguage } from '../skill-trees/dto/create-skill-tree.dto';
import { EvaluationService } from '../evaluation/evaluation.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    private readonly evaluationService: EvaluationService,
  ) {}

  async createChat(userId: string, dto: CreateChatDto) {
    this.logger.log(`Creating chat for user ${userId}, skillTree ${dto.skillTreeId}`);
    const chat = await this.chatModel.create({
      userId,
      skillTreeId: dto.skillTreeId,
      title: '',
      messages: [],
    });
    return chat;
  }

  async listChats(userId: string, skillTreeId: string) {
    const chats = await this.chatModel
      .find({ userId, skillTreeId })
      .sort({ updatedAt: -1 })
      .lean();

    return chats.map((chat) => {
      const lastAssistant = [...chat.messages].reverse().find((message) => message.role === 'assistant');
      return {
        _id: chat._id,
        title: chat.title,
        preview: lastAssistant ? lastAssistant.content.slice(0, 50) : '',
        createdAt: (chat as any).createdAt,
      };
    });
  }

  async getChat(userId: string, chatId: string) {
    const chat = await this.chatModel.findOne({ _id: chatId, userId }).lean();
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async streamMessage(userId: string, chatId: string, dto: SendMessageDto, res: Response) {
    const chat = await this.chatModel.findOne({ _id: chatId, userId });
    if (!chat) throw new NotFoundException('Chat not found');

    const skillTree = await this.skillTreeModel.findById(chat.skillTreeId).lean();
    if (!skillTree) throw new NotFoundException('Skill tree not found');

    const language = dto.language ?? skillTree.language ?? 'zh-CN';
    const focusedNode = dto.nodeId
      ? skillTree.nodes.find((node) => node.id === dto.nodeId)
      : null;

    const nodeListText = skillTree.nodes
      .map((node) => {
        const completed = skillTree.completedNodes.includes(node.id);
        const status = language === 'en-US'
          ? (completed ? 'completed' : 'not completed')
          : (completed ? '已完成' : '未完成');
        return `- ${node.title} [${status}]`;
      })
      .join('\n');

    const focusedNodeText = focusedNode
      ? language === 'en-US'
        ? `\nCurrently discussed node: ${focusedNode.title}\nNode description: ${focusedNode.description}`
        : `\n当前讨论的节点：${focusedNode.title}\n节点描述：${focusedNode.description}`
      : '';

    const memory = await this.ragService.searchLearningMemory({
      userId,
      skillTreeId: String(chat.skillTreeId),
      query: dto.content,
    });
    const pastMistakes = memory.mistakes.map((item) => item.content);
    const docChunks = memory.documents.map((item) => item.content);
    await this.logEvaluation({
      userId,
      skillTreeId: String(chat.skillTreeId),
      nodeId: dto.nodeId,
      type: 'rag_retrieved',
      metadata: {
        interaction: 'chat',
        queryLength: dto.content.length,
        mistakeHits: pastMistakes.length,
        documentHits: docChunks.length,
        totalHits: memory.totalHits,
        sourceTypes: [
          ...(pastMistakes.length > 0 ? ['mistake'] : []),
          ...(docChunks.length > 0 ? ['document'] : []),
        ],
      },
    });
    res.write(`data: ${JSON.stringify({
      type: 'rag_context',
      mistakeHits: pastMistakes.length,
      documentHits: docChunks.length,
      totalHits: memory.totalHits,
    })}\n\n`);

    const mistakesText = pastMistakes.length > 0
      ? language === 'en-US'
        ? `\nLearner's past mistakes. Use these weak spots when answering:\n${pastMistakes.map((mistake, index) => `${index + 1}. ${mistake}`).join('\n')}`
        : `\n用户历史错题（请结合这些薄弱点回答）：\n${pastMistakes.map((mistake, index) => `${index + 1}. ${mistake}`).join('\n')}`
      : '';
    const docText = docChunks.length > 0
      ? language === 'en-US'
        ? `\nReference material snippets uploaded by the learner:\n${docChunks.map((chunk, index) => `${index + 1}. ${chunk}`).join('\n')}`
        : `\n参考资料片段（用户上传的学习资料，回答时可引用）：\n${docChunks.map((chunk, index) => `${index + 1}. ${chunk}`).join('\n')}`
      : '';

    const pathAnalysis = analyzePathSimilarity(skillTree.nodes, skillTree.completedNodes ?? []);
    const completedCount = pathAnalysis.userPath.length;
    const totalCount = pathAnalysis.expertPath.length;
    const nextTitles = pathAnalysis.nextRecommended
      .slice(0, 3)
      .map((id) => skillTree.nodes.find((node) => node.id === id)?.title ?? id);
    const pathAnalysisText = totalCount > 0
      ? language === 'en-US'
        ? `\nLearning path analysis: completed ${completedCount}/${totalCount} nodes, path similarity score ${pathAnalysis.similarityScore}/100. ${nextTitles.length > 0 ? `Recommended next: ${nextTitles.join(', ')}.` : 'All nodes are complete.'}`
        : `\n学习路径分析：已完成 ${completedCount}/${totalCount} 个节点，路径相似度评分 ${pathAnalysis.similarityScore}/100。${nextTitles.length > 0 ? `建议接下来学习：${nextTitles.join('、')}。` : '所有节点已完成。'}`
      : '';

    const systemPrompt = buildChatSystemPrompt({
      language,
      title: skillTree.title,
      goal: skillTree.goal,
      currentLevel: skillTree.currentLevel,
      nodeListText,
      focusedNodeText,
      pathAnalysisText,
      mistakesText,
      docText,
    });

    const historyMessages = chat.messages.slice(-20).map((message) =>
      message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content),
    );

    const messages = [
      new SystemMessage(systemPrompt),
      ...historyMessages,
      new HumanMessage(dto.content),
    ];

    chat.messages.push({ role: 'user', content: dto.content, nodeId: dto.nodeId, createdAt: new Date() });
    if (!chat.title && dto.content) chat.title = dto.content.slice(0, 50);

    this.logger.log(`Streaming message for chat ${chatId}, language=${language}`);

    let fullContent = '';
    try {
      const stream = await this.aiService.streamChat(messages);
      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (text) {
          fullContent += text;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
        }
      }

      chat.messages.push({ role: 'assistant', content: fullContent, createdAt: new Date() });
      await chat.save();

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      this.logger.error(`Stream error for chat ${chatId}: ${(err as Error).message}`);
      const message = language === 'en-US' ? 'AI reply failed. Please try again.' : 'AI 回复失败，请重试。';
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    } finally {
      res.end();
    }
  }

  private async logEvaluation(input: Parameters<EvaluationService['recordEvent']>[0]) {
    try {
      await this.evaluationService.recordEvent(input);
    } catch (err) {
      this.logger.warn(`Evaluation event skipped: ${(err as Error).message}`);
    }
  }
}

function buildChatSystemPrompt(params: {
  language: AppLanguage;
  title: string;
  goal: string;
  currentLevel: string;
  nodeListText: string;
  focusedNodeText: string;
  pathAnalysisText: string;
  mistakesText: string;
  docText: string;
}) {
  if (params.language === 'en-US') {
    return `You are a professional learning assistant helping the learner study "${params.title}".

Learning goal: ${params.goal}
Current level: ${params.currentLevel}

Skill-tree nodes, formatted as title [status]:
${params.nodeListText}
${params.focusedNodeText}
${params.pathAnalysisText}
${params.mistakesText}
${params.docText}

Answer in English. Keep responses concise, professional, and specific. If the learner has historical mistakes, help correct the relevant misconceptions. Use the path analysis to guide the learner toward the recommended next node when appropriate. If the question is unrelated to the learning content, gently guide the learner back to the topic.`;
  }

  return `你是一个专业的学习助手，帮助用户学习「${params.title}」。

用户学习目标：${params.goal}
当前水平：${params.currentLevel}

技能树节点（格式：节点标题 [状态]）：
${params.nodeListText}
${params.focusedNodeText}
${params.pathAnalysisText}
${params.mistakesText}
${params.docText}

请用中文回答，回答要简洁、专业、有针对性。如果用户有历史错题，请在回答时有针对性地帮助他纠正误区。根据路径分析，在合适的时候引导用户按推荐顺序学习下一个节点。如果用户的问题与当前学习内容无关，请温和地引导回学习主题。`;
}
