import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { Document } from '@langchain/core/documents';

interface QuizMistake {
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly embeddings: OpenAIEmbeddings;
  private readonly qdrantUrl: string;
  private readonly collectionName = 'quiz_mistakes';

  constructor(private readonly config: ConfigService) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.get<string>('OPENAI_API_KEY'),
      model: 'text-embedding-3-small',
    });
    this.qdrantUrl = config.get<string>('QDRANT_URL') ?? 'http://localhost:6333';
  }

  private getStore(): QdrantVectorStore {
    return new QdrantVectorStore(this.embeddings, {
      url: this.qdrantUrl,
      collectionName: this.collectionName,
    });
  }

  async storeQuizMistakes(
    userId: string,
    skillTreeId: string,
    nodeId: string,
    nodeTitle: string,
    mistakes: QuizMistake[],
  ): Promise<void> {
    if (mistakes.length === 0) return;

    const docs = mistakes.map(
      (m) =>
        new Document({
          pageContent: `节点「${nodeTitle}」测验 - 题目：${m.question}，用户选择了「${m.userAnswer}」（错误），正确答案是「${m.correctAnswer}」`,
          metadata: { userId, skillTreeId, nodeId, nodeTitle },
        }),
    );

    const store = this.getStore();
    await store.addDocuments(docs);
    this.logger.log(`Stored ${docs.length} quiz mistake(s) for node ${nodeId}`);
  }

  async searchMistakes(
    userId: string,
    skillTreeId: string,
    query: string,
    k = 3,
  ): Promise<string[]> {
    try {
      const store = this.getStore();
      const results = await store.similaritySearch(query, k, {
        must: [
          { key: 'metadata.userId', match: { value: userId } },
          { key: 'metadata.skillTreeId', match: { value: skillTreeId } },
        ],
      });
      return results.map((r) => r.pageContent);
    } catch (err) {
      // Qdrant 集合不存在时（还没有存过错题）静默返回空数组
      this.logger.warn(`RAG search skipped: ${(err as Error).message}`);
      return [];
    }
  }
}
