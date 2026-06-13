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

export type RagSourceType = 'mistake' | 'document';

export interface RagSearchResult {
  content: string;
  sourceType: RagSourceType;
  metadata: Record<string, unknown>;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly embeddings: OpenAIEmbeddings;
  private readonly qdrantUrl: string;

  constructor(private readonly config: ConfigService) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.get<string>('OPENAI_API_KEY'),
      model: 'text-embedding-3-small',
    });
    this.qdrantUrl = config.get<string>('QDRANT_URL') ?? 'http://localhost:6333';
  }

  private getStore(collectionName: string): QdrantVectorStore {
    return new QdrantVectorStore(this.embeddings, {
      url: this.qdrantUrl,
      collectionName,
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

    const occurredAt = new Date().toISOString();
    const docs = mistakes.map(
      (m, index) =>
        new Document({
          pageContent: `节点「${nodeTitle}」测验 - 题目：${m.question}，用户选择了「${m.userAnswer}」（错误），正确答案是「${m.correctAnswer}」`,
          metadata: {
            userId,
            skillTreeId,
            nodeId,
            nodeTitle,
            question: m.question,
            userAnswer: m.userAnswer,
            correctAnswer: m.correctAnswer,
            occurredAt,
            mistakeIndex: index,
            type: 'quiz_mistake',
          },
        }),
    );

    const store = this.getStore('quiz_mistakes');
    await store.addDocuments(docs);
    this.logger.log(`Stored ${docs.length} quiz mistake(s) for node ${nodeId}`);
  }

  async searchMistakes(
    userId: string,
    skillTreeId: string,
    query: string,
    k = 3,
  ): Promise<string[]> {
    const results = await this.searchMistakeDetails(userId, skillTreeId, query, k);
    return results.map((result) => result.content);
  }

  async searchMistakeDetails(
    userId: string,
    skillTreeId: string,
    query: string,
    k = 3,
  ): Promise<RagSearchResult[]> {
    try {
      const store = this.getStore('quiz_mistakes');
      const results = await store.similaritySearch(query, k, {
        must: [
          { key: 'metadata.userId', match: { value: userId } },
          { key: 'metadata.skillTreeId', match: { value: skillTreeId } },
        ],
      });
      return results.map((result) => ({
        content: result.pageContent,
        sourceType: 'mistake',
        metadata: result.metadata ?? {},
      }));
    } catch (err) {
      this.logger.warn(`RAG search skipped: ${(err as Error).message}`);
      return [];
    }
  }

  async storeDocument(userId: string, skillTreeId: string, chunks: string[]): Promise<void> {
    if (chunks.length === 0) return;
    const uploadedAt = new Date().toISOString();
    const docs = chunks.map(
      (chunk, index) =>
        new Document({
          pageContent: chunk,
          metadata: { userId, skillTreeId, type: 'document', chunkIndex: index, uploadedAt },
        }),
    );
    const store = this.getStore('skill_documents');
    await store.addDocuments(docs);
    this.logger.log(`Stored ${docs.length} document chunk(s) for skillTree ${skillTreeId}`);
  }

  async searchDocuments(
    userId: string,
    skillTreeId: string,
    query: string,
    k = 5,
  ): Promise<string[]> {
    const results = await this.searchDocumentDetails(userId, skillTreeId, query, k);
    return results.map((result) => result.content);
  }

  async searchDocumentDetails(
    userId: string,
    skillTreeId: string,
    query: string,
    k = 5,
  ): Promise<RagSearchResult[]> {
    try {
      const store = this.getStore('skill_documents');
      const results = await store.similaritySearch(query, k, {
        must: [
          { key: 'metadata.userId', match: { value: userId } },
          { key: 'metadata.skillTreeId', match: { value: skillTreeId } },
        ],
      });
      return results.map((result) => ({
        content: result.pageContent,
        sourceType: 'document',
        metadata: result.metadata ?? {},
      }));
    } catch (err) {
      this.logger.warn(`Document search skipped: ${(err as Error).message}`);
      return [];
    }
  }

  async searchLearningMemory(input: {
    userId: string;
    skillTreeId: string;
    query: string;
    mistakeLimit?: number;
    documentLimit?: number;
  }): Promise<{ mistakes: RagSearchResult[]; documents: RagSearchResult[]; totalHits: number }> {
    const [mistakes, documents] = await Promise.all([
      this.searchMistakeDetails(input.userId, input.skillTreeId, input.query, input.mistakeLimit ?? 3),
      this.searchDocumentDetails(input.userId, input.skillTreeId, input.query, input.documentLimit ?? 5),
    ]);

    return { mistakes, documents, totalHits: mistakes.length + documents.length };
  }
}
