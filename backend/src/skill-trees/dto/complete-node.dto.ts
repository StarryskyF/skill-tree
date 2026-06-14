import { IsArray, IsInt, ArrayMaxSize, ArrayMinSize, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteNodeDto {
  @IsString()
  @IsNotEmpty()
  quizSessionId: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  @Type(() => Number)
  quizAnswers: number[];
}
