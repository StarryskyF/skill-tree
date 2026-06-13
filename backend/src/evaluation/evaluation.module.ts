import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationEvent, EvaluationEventSchema } from './schemas/evaluation-event.schema';
import { SkillTree, SkillTreeSchema } from '../skill-trees/schemas/skill-tree.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SkillTree.name, schema: SkillTreeSchema },
      { name: User.name, schema: UserSchema },
      { name: EvaluationEvent.name, schema: EvaluationEventSchema },
    ]),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
