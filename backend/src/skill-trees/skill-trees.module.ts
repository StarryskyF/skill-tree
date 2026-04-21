import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillTreesController } from './skill-trees.controller';
import { SkillTreesService } from './skill-trees.service';
import { SkillTree, SkillTreeSchema } from './schemas/skill-tree.schema';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SkillTree.name, schema: SkillTreeSchema }]),
    AiModule,
    RagModule,
  ],
  controllers: [SkillTreesController],
  providers: [SkillTreesService],
})
export class SkillTreesModule {}
