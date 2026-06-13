import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EvaluationEventDocument = EvaluationEvent & Document;

export type EvaluationEventType =
  | 'tree_created'
  | 'tree_ready'
  | 'tree_failed'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'node_completed'
  | 'exp_gained'
  | 'badge_unlocked'
  | 'rag_retrieved';

@Schema({ timestamps: true })
export class EvaluationEvent {
  @Prop({ required: true }) userId: string;
  @Prop() skillTreeId?: string;
  @Prop() nodeId?: string;
  @Prop({ required: true }) type: EvaluationEventType;
  @Prop() score?: number;
  @Prop() exp?: number;
  @Prop({ type: Object, default: {} }) metadata: Record<string, unknown>;
}

export const EvaluationEventSchema = SchemaFactory.createForClass(EvaluationEvent);
