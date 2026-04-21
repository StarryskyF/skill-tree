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

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
    private readonly aiService: AiService,
    private readonly ragService: RagService,
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

    return chats.map((c) => {
      const lastAssistant = [...c.messages].reverse().find((m) => m.role === 'assistant');
      return {
        _id: c._id,
        title: c.title,
        preview: lastAssistant ? lastAssistant.content.slice(0, 50) : '',
        createdAt: (c as any).createdAt,
      };
    });
  }

  async getChat(userId: string, chatId: string) {
    const chat = await this.chatModel.findOne({ _id: chatId, userId }).lean();
    if (!chat) throw new NotFoundException('对话不存在');
    return chat;
  }

  async streamMessage(userId: string, chatId: string, dto: SendMessageDto, res: Response) {
    const chat = await this.chatModel.findOne({ _id: chatId, userId });
    if (!chat) throw new NotFoundException('对话不存在');

    const skillTree = await this.skillTreeModel.findById(chat.skillTreeId).lean();
    if (!skillTree) throw new NotFoundException('技能树不存在');

    const focusedNode = dto.nodeId
      ? skillTree.nodes.find((n) => n.id === dto.nodeId)
      : null;

    const nodeListText = skillTree.nodes
      .map((n) => `- ${n.title} [${skillTree.completedNodes.includes(n.id) ? '已完成' : '未完成'}]`)
      .join('\n');

    const focusedNodeText = focusedNode
      ? `\n当前讨论的节点：${focusedNode.title}\n节点描述：${focusedNode.description}`
      : '';

    // 并行检索错题记录和文档资料
    const [pastMistakes, docChunks] = await Promise.all([
      this.ragService.searchMistakes(userId, String(chat.skillTreeId), dto.content),
      this.ragService.searchDocuments(userId, String(chat.skillTreeId), dto.content),
    ]);
    const mistakesText = pastMistakes.length > 0
      ? `\n用户历史错题（请结合这些薄弱点回答）：\n${pastMistakes.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
      : '';
    const docText = docChunks.length > 0
      ? `\n参考资料片段（用户上传的学习资料，回答时可引用）：\n${docChunks.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    // 路径相似度分析
    const pathAnalysis = analyzePathSimilarity(skillTree.nodes, skillTree.completedNodes ?? []);
    const completedCount = pathAnalysis.userPath.length;
    const totalCount = pathAnalysis.expertPath.length;
    const pathAnalysisText = totalCount > 0
      ? `\n学习路径分析：已完成 ${completedCount}/${totalCount} 个节点，路径相似度评分 ${pathAnalysis.similarityScore}/100。${pathAnalysis.nextRecommended.length > 0 ? `建议接下来学习：${pathAnalysis.nextRecommended.slice(0, 3).map((id) => skillTree.nodes.find((n) => n.id === id)?.title ?? id).join('、')}。` : '所有节点已完成！'}`
      : '';

    const systemPrompt = `你是一个专业的学习助手，帮助用户学习「${skillTree.title}」。

用户学习目标：${skillTree.goal}
当前水平：${skillTree.currentLevel}

技能树节点（格式：节点标题 [状态]）：
${nodeListText}
${focusedNodeText}
${pathAnalysisText}
${mistakesText}
${docText}
请用中文回答，回答要简洁、专业、有针对性。如果用户有历史错题，请在回答时有针对性地帮助他纠正误区。根据路径分析，在合适的时候引导用户按推荐顺序学习下一个节点。如果用户的问题与当前学习内容无关，请温和地引导回学习主题。`;

    const historyMessages = chat.messages.slice(-20).map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
    );

    const messages = [
      new SystemMessage(systemPrompt),
      ...historyMessages,
      new HumanMessage(dto.content),
    ];

    // Save user message
    chat.messages.push({ role: 'user', content: dto.content, nodeId: dto.nodeId, createdAt: new Date() });
    if (!chat.title && dto.content) {
      chat.title = dto.content.slice(0, 50);
    }

    this.logger.log(`Streaming message for chat ${chatId}`);

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
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 回复失败，请重试' })}\n\n`);
    } finally {
      res.end();
    }
  }
}
