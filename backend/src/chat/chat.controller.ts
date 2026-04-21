import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createChat(@Req() req: Request, @Body() dto: CreateChatDto) {
    return this.chatService.createChat((req.user as any).id, dto);
  }

  @Get()
  listChats(@Req() req: Request, @Query('skillTreeId') skillTreeId: string) {
    return this.chatService.listChats((req.user as any).id, skillTreeId);
  }

  @Get(':id')
  getChat(@Req() req: Request, @Param('id') id: string) {
    return this.chatService.getChat((req.user as any).id, id);
  }

  @Post(':id/messages')
  async streamMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    await this.chatService.streamMessage((req.user as any).id, id, dto, res);
  }
}
