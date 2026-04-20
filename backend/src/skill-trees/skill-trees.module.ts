import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillTreesController } from './skill-trees.controller';
import { SkillTreesService } from './skill-trees.service';
import { SkillTree, SkillTreeSchema } from './schemas/skill-tree.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SkillTree.name, schema: SkillTreeSchema }]),
    AiModule,
  ],
  controllers: [SkillTreesController],
  providers: [SkillTreesService],
})
export class SkillTreesModule {}
