import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ required: true, enum: ['user', 'assistant'] }) role: 'user' | 'assistant';
  @Prop({ required: true }) content: string;
  @Prop() nodeId?: string;
  @Prop({ required: true, default: () => new Date() }) createdAt: Date;
}

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) skillTreeId: string;
  @Prop({ default: '' }) title: string;
  @Prop({ type: [Object], default: [] }) messages: ChatMessage[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
