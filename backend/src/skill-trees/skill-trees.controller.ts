import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkillTreesService } from './skill-trees.service';
import { CreateSkillTreeDto } from './dto/create-skill-tree.dto';
import { CompleteNodeDto } from './dto/complete-node.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SkillTree, SkillTreeDocument } from './schemas/skill-tree.schema';

interface AuthRequest extends Request {
  user: { id: string; username: string; name: string };
}

@Controller('skill-trees')
@UseGuards(JwtAuthGuard)
export class SkillTreesController {
  constructor(
    private readonly skillTreesService: SkillTreesService,
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateSkillTreeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.skillTreesService.create(req.user.id, dto, file);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.skillTreesService.findAll(req.user.id);
  }

  @Get(':id/node-statuses')
  getNodeStatuses(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.skillTreesService.getNodeStatuses(req.user.id, id);
  }

  @Post(':id/nodes/:nodeId/quiz')
  generateQuiz(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.skillTreesService.generateNodeQuiz(req.user.id, id, nodeId, dto.language, dto.forceRegenerate);
  }

  @Post(':id/nodes/:nodeId/complete')
  completeNode(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: CompleteNodeDto,
  ) {
    return this.skillTreesService.completeNode(req.user.id, id, nodeId, dto);
  }

  @Get(':id/path-analysis')
  getPathAnalysis(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.skillTreesService.getPathAnalysis(req.user.id, id);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.skillTreesService.findOne(req.user.id, id);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.skillTreesService.remove(req.user.id, id);
  }

  @Get(':id/progress')
  async streamProgress(
    @Param('id') id: string,
    @Req() req: AuthRequest & { query: { token?: string; language?: string } },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const isEnglish = req.query.language === 'en-US';
    const steps = [
      { message: isEnglish ? 'Analyzing learning goal...' : '正在分析学习目标...', percent: 20 },
      { message: isEnglish ? 'Planning skill nodes...' : '正在规划技能节点...', percent: 45 },
      { message: isEnglish ? 'Building dependencies...' : '正在构建依赖关系...', percent: 70 },
      { message: isEnglish ? 'Finishing up...' : '正在收尾...', percent: 90 },
    ];
    let stepIndex = 0;

    const sendEvent = (event: string, data: object) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const timeout = setTimeout(() => {
      sendEvent('error', { message: isEnglish ? 'Generation timed out' : '生成超时' });
      res.end();
    }, 60000);

    const interval = setInterval(async () => {
      try {
        const doc = await this.skillTreeModel.findById(id).exec();
        if (!doc) {
          clearInterval(interval);
          clearTimeout(timeout);
          sendEvent('error', { message: isEnglish ? 'Skill tree not found' : '技能树不存在' });
          res.end();
          return;
        }

        if (doc.status === 'ready') {
          clearInterval(interval);
          clearTimeout(timeout);
          sendEvent('complete', { status: 'ready' });
          res.end();
          return;
        }

        if (doc.status === 'failed') {
          clearInterval(interval);
          clearTimeout(timeout);
          sendEvent('error', { message: doc.errorMessage ?? (isEnglish ? 'Generation failed' : '生成失败') });
          res.end();
          return;
        }

        const step = steps[Math.min(stepIndex, steps.length - 1)];
        sendEvent('progress', { step: stepIndex + 1, message: step.message, percent: step.percent });
        stepIndex++;
      } catch {
        clearInterval(interval);
        clearTimeout(timeout);
        sendEvent('error', { message: isEnglish ? 'Internal server error' : '服务器内部错误' });
        res.end();
      }
    }, 1500);

    req.on('close', () => {
      clearInterval(interval);
      clearTimeout(timeout);
    });
  }
}
