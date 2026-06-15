import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import type { AIMessageChunk } from '@langchain/core/messages';
import { z } from 'zod';
import { buildSkillTreePrompt } from './prompts/skill-tree.prompt';
import { buildQuizPrompt } from './prompts/quiz.prompt';
import type { AppLanguage } from '../skill-trees/dto/create-skill-tree.dto';

const SkillNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  level: z.number().int().min(0),
  prerequisites: z.array(z.string()),
  exp: z.number().int().min(5).max(50),
});

const SkillEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

const SkillTreeResultSchema = z.object({
  title: z.string(),
  nodes: z.array(SkillNodeSchema).min(5).max(25),
  edges: z.array(SkillEdgeSchema),
});

export type SkillTreeAiResult = z.infer<typeof SkillTreeResultSchema>;

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional().default('Review the related concept and compare each option carefully.'),
});

const QuizResultSchema = z.array(QuizQuestionSchema).length(3);

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model: ChatOpenAI;

  constructor(private config: ConfigService) {
    this.model = new ChatOpenAI({
      apiKey: this.config.get<string>('DEEPSEEK_API_KEY'),
      model: this.config.get<string>('DEEPSEEK_MODEL') ?? 'deepseek-chat',
      configuration: {
        baseURL: 'https://api.deepseek.com/v1',
      },
    });
  }

  async generateSkillTree(
    goal: string,
    currentLevel: string,
    documentContext?: string,
    language: AppLanguage = 'zh-CN',
  ): Promise<SkillTreeAiResult> {
    const prompt = buildSkillTreePrompt(goal, currentLevel, documentContext, language);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let content: string | undefined;
      try {
        this.logger.log(`Generating skill tree (attempt ${attempt}/${maxRetries}, language=${language}): ${goal}`);
        const response = await this.model.invoke([new HumanMessage(prompt)]);
        content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = SkillTreeResultSchema.parse(parsed);
        this.logger.log(`Skill tree generated successfully on attempt ${attempt}`);
        return validated;
      } catch (err) {
        if (content) this.logger.warn(`Raw AI response (attempt ${attempt}): ${content}`);
        this.logger.warn(`Attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt === maxRetries) {
          throw new Error(`AI generation failed after ${maxRetries} retries: ${(err as Error).message}`);
        }
      }
    }

    throw new Error('unreachable');
  }

  async streamChat(messages: BaseMessage[]): Promise<AsyncIterable<AIMessageChunk>> {
    return this.model.stream(messages);
  }

  async generateQuiz(
    title: string,
    description: string,
    treeGoal: string,
    language: AppLanguage = 'zh-CN',
    learningContext?: string,
  ): Promise<QuizQuestion[]> {
    const prompt = buildQuizPrompt(title, description, treeGoal, language, learningContext);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let content: string | undefined;
      try {
        this.logger.log(`Generating quiz (attempt ${attempt}/${maxRetries}, language=${language}): ${title}`);
        const response = await this.model.invoke([new HumanMessage(prompt)]);
        content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = QuizResultSchema.parse(parsed);
        this.logger.log(`Quiz generated successfully on attempt ${attempt}`);
        return validated;
      } catch (err) {
        if (content) this.logger.warn(`Raw AI response (attempt ${attempt}): ${content}`);
        this.logger.warn(`Quiz attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt === maxRetries) {
          throw new Error(`Quiz generation failed after ${maxRetries} retries: ${(err as Error).message}`);
        }
      }
    }

    throw new Error('unreachable');
  }
}
