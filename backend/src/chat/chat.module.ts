import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { SkillTree, SkillTreeSchema } from '../skill-trees/schemas/skill-tree.schema';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: SkillTree.name, schema: SkillTreeSchema },
    ]),
    AiModule,
    RagModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
