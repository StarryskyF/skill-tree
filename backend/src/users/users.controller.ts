import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SkillTree, SkillTreeDocument } from '../skill-trees/schemas/skill-tree.schema';

const uploadDir = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectModel(SkillTree.name) private skillTreeModel: Model<SkillTreeDocument>,
  ) {}

  @Get('me/stats')
  async getStats(@Req() req: Request) {
    const userId = (req.user as any).id;
    const treeCount = await this.skillTreeModel.countDocuments({ userId }).exec();
    return this.usersService.getUserStats(userId, treeCount);
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    this.logger.log(`Getting profile for user: ${(req.user as any).id}`);
    return this.usersService.findById((req.user as any).id);
  }

  @Put('me/profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    this.logger.log(`Update profile request for user: ${(req.user as any).id}`);
    return this.usersService.updateProfile((req.user as any).id, dto);
  }

  @Put('me/password')
  async updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    this.logger.log(`Update password request for user: ${(req.user as any).id}`);
    await this.usersService.updatePassword((req.user as any).id, dto.oldPassword, dto.newPassword);
    return { message: '密码修改成功' };
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('只允许上传图片文件'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择文件');
    this.logger.log(`Avatar uploaded for user: ${(req.user as any).id}, file: ${file.filename}`);
    const avatarUrl = `http://localhost:3000/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar((req.user as any).id, avatarUrl);
  }
}
