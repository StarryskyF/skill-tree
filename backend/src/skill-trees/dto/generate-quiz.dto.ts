import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { AppLanguage } from './create-skill-tree.dto';

export class GenerateQuizDto {
  @IsString()
  @IsOptional()
  @IsIn(['zh-CN', 'en-US'])
  language?: AppLanguage;

  @IsBoolean()
  @IsOptional()
  forceRegenerate?: boolean;
}
