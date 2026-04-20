import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { buildSkillTreePrompt } from './prompts/skill-tree.prompt';
import { buildQuizPrompt } from './prompts/quiz.prompt';

const SkillNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  level: z.number().int().min(0),
  prerequisites: z.array(z.string()),
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

  async generateSkillTree(goal: string, currentLevel: string): Promise<SkillTreeAiResult> {
    const prompt = buildSkillTreePrompt(goal, currentLevel);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Generating skill tree (attempt ${attempt}/${maxRetries}): ${goal}`);
        const response = await this.model.invoke([new HumanMessage(prompt)]);
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = SkillTreeResultSchema.parse(parsed);
        this.logger.log(`Skill tree generated successfully on attempt ${attempt}`);
        return validated;
      } catch (err) {
        this.logger.warn(`Attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt === maxRetries) {
          throw new Error(`AI 生成失败（已重试 ${maxRetries} 次）：${(err as Error).message}`);
        }
      }
    }

    throw new Error('unreachable');
  }

  async generateQuiz(title: string, description: string): Promise<QuizQuestion[]> {
    const prompt = buildQuizPrompt(title, description);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Generating quiz (attempt ${attempt}/${maxRetries}): ${title}`);
        const response = await this.model.invoke([new HumanMessage(prompt)]);
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = QuizResultSchema.parse(parsed);
        this.logger.log(`Quiz generated successfully on attempt ${attempt}`);
        return validated;
      } catch (err) {
        this.logger.warn(`Quiz attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt === maxRetries) {
          throw new Error(`Quiz 生成失败（已重试 ${maxRetries} 次）：${(err as Error).message}`);
        }
      }
    }

    throw new Error('unreachable');
  }
}
