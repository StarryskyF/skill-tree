import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { AppLanguage } from '../../skill-trees/dto/create-skill-tree.dto';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  nodeId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['zh-CN', 'en-US'])
  language?: AppLanguage;
}
