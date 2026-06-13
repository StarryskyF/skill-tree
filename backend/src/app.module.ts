import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HelloModule } from './hello/hello.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { SkillTreesModule } from './skill-trees/skill-trees.module';
import { ChatModule } from './chat/chat.module';
import { RagModule } from './rag/rag.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    HelloModule,
    UsersModule,
    AuthModule,
    AiModule,
    SkillTreesModule,
    ChatModule,
    RagModule,
    EvaluationModule,
  ],
})
export class AppModule {}
