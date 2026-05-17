import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export type AppLanguage = 'zh-CN' | 'en-US';

export class CreateSkillTreeDto {
  @IsString()
  @IsNotEmpty({ message: 'Learning goal is required' })
  @MaxLength(200)
  goal: string;

  @IsString()
  @IsNotEmpty({ message: 'Current level is required' })
  @MaxLength(200)
  currentLevel: string;

  @IsString()
  @IsOptional()
  @IsIn(['zh-CN', 'en-US'])
  language?: AppLanguage;
}
