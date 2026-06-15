import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SkillTreeDocument = SkillTree & Document;

@Schema({ _id: false })
export class SkillNode {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) description: string;
  @Prop({ required: true }) level: number;
  @Prop({ type: [String], default: [] }) prerequisites: string[];
  @Prop({ default: 10 }) exp: number;
}

@Schema({ _id: false })
export class SkillEdge {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) source: string;
  @Prop({ required: true }) target: string;
}

@Schema({ _id: false })
export class NodeQuizPerformance {
  @Prop({ required: true }) nodeId: string;
  @Prop({ default: 0 }) attempts: number;
  @Prop({ default: 0 }) passCount: number;
  @Prop({ default: 0 }) failCount: number;
  @Prop({ default: 0 }) consecutiveFailures: number;
  @Prop({ default: 0 }) lastScore: number;
  @Prop() lastAttemptAt?: Date;
  @Prop() lastPassedAt?: Date;
  @Prop() lastFailedAt?: Date;
}

@Schema({ _id: false })
export class PendingQuizSession {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) nodeId: string;
  @Prop({ enum: ['active', 'failed', 'passed'], default: 'active' })
  status: 'active' | 'failed' | 'passed';
  @Prop({ type: [Object], default: [] }) questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  @Prop({ type: [Number], default: undefined }) lastAnswers?: number[];
  @Prop() lastScore?: number;
  @Prop({ default: 0 }) attempts: number;
  @Prop({ default: Date.now }) createdAt: Date;
  @Prop({ default: Date.now }) updatedAt: Date;
}

@Schema({ timestamps: true })
export class SkillTree {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) goal: string;
  @Prop({ required: true }) currentLevel: string;
  @Prop({ enum: ['zh-CN', 'en-US'], default: 'zh-CN' }) language: 'zh-CN' | 'en-US';
  @Prop({ default: '' }) title: string;
  @Prop({ enum: ['generating', 'ready', 'failed'], default: 'generating' })
  status: 'generating' | 'ready' | 'failed';
  @Prop({ type: [Object], default: [] }) nodes: SkillNode[];
  @Prop({ type: [Object], default: [] }) edges: SkillEdge[];
  @Prop({ type: [String], default: [] }) completedNodes: string[];
  @Prop({ type: [Object], default: [] }) quizPerformance: NodeQuizPerformance[];
  @Prop({ type: [Object], default: [] }) pendingQuizSessions: PendingQuizSession[];
  @Prop() errorMessage?: string;
}

export const SkillTreeSchema = SchemaFactory.createForClass(SkillTree);
