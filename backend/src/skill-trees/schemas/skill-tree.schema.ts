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
}

@Schema({ _id: false })
export class SkillEdge {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) source: string;
  @Prop({ required: true }) target: string;
}

@Schema({ timestamps: true })
export class SkillTree {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) goal: string;
  @Prop({ required: true }) currentLevel: string;
  @Prop({ default: '' }) title: string;
  @Prop({ enum: ['generating', 'ready', 'failed'], default: 'generating' })
  status: 'generating' | 'ready' | 'failed';
  @Prop({ type: [Object], default: [] }) nodes: SkillNode[];
  @Prop({ type: [Object], default: [] }) edges: SkillEdge[];
  @Prop({ type: [String], default: [] }) completedNodes: string[];
  @Prop() errorMessage?: string;
}

export const SkillTreeSchema = SchemaFactory.createForClass(SkillTree);
