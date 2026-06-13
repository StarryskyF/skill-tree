import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillTreesController } from './skill-trees.controller';
import { SkillTreesService } from './skill-trees.service';
import { SkillTree, SkillTreeSchema } from './schemas/skill-tree.schema';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { UsersModule } from '../users/users.module';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SkillTree.name, schema: SkillTreeSchema }]),
    AiModule,
    RagModule,
    UsersModule,
    EvaluationModule,
  ],
  controllers: [SkillTreesController],
  providers: [SkillTreesService],
})
export class SkillTreesModule {}
