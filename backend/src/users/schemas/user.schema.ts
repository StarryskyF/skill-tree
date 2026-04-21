import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true }) username: string;
  @Prop({ required: true }) password: string;
  @Prop({ required: true }) name: string;
  @Prop() avatar?: string;
  @Prop({ default: 0 }) exp: number;
  @Prop({ default: 1 }) level: number;
  @Prop({ type: [String], default: [] }) badges: string[];
  @Prop({ default: 0 }) totalCompletedNodes: number;
  @Prop({ default: 0 }) streakDays: number;
  @Prop() lastActiveDate?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
