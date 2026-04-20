import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSkillTreeDto {
  @IsString()
  @IsNotEmpty({ message: '学习目标不能为空' })
  @MaxLength(200)
  goal: string;

  @IsString()
  @IsNotEmpty({ message: '当前水平不能为空' })
  @MaxLength(200)
  currentLevel: string;
}
