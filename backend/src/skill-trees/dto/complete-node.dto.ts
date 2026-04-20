import { IsArray, IsInt, ArrayMinSize, ArrayMaxSize, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizQuestionDto {
  question: string;
  options: string[];
  correctIndex: number;
}

export class CompleteNodeDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  @Type(() => Number)
  quizAnswers: number[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  questions: QuizQuestionDto[];
}
