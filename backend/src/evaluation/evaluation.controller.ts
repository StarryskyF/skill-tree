import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EvaluationService } from './evaluation.service';

@Controller('evaluation')
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('summary')
  getSummary(@Req() req: Request) {
    return this.evaluationService.getSummary((req.user as any).id);
  }

  @Get('skill-trees')
  getSkillTrees(@Req() req: Request) {
    return this.evaluationService.getSkillTrees((req.user as any).id);
  }
}
