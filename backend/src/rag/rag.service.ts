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
  private readonly timeoutMs: number;
  private readonly disabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.get<string>('OPENAI_API_KEY'),
      model: 'text-embedding-3-small',
    });
    this.qdrantUrl = config.get<string>('QDRANT_URL') ?? 'http://localhost:6333';
    this.timeoutMs = Number(config.get<string>('RAG_TIMEOUT_MS') ?? 3000);
    this.disabled = config.get<string>('RAG_DISABLED') === 'true';
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
    if (this.disabled || mistakes.length === 0) return;

    const occurredAt = new Date().toISOString();
    const docs = mistakes.map(
      (m, index) =>
        new Document({
          pageContent: `Node "${nodeTitle}" quiz mistake. Question: ${m.question}. User answer: ${m.userAnswer}. Correct answer: ${m.correctAnswer}.`,
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
    await this.withTimeout(store.addDocuments(docs), 'store quiz mistakes');
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
    if (this.disabled) return [];

    try {
      const store = this.getStore('quiz_mistakes');
      const results = await this.withTimeout(
        store.similaritySearch(query, k, {
          must: [
            { key: 'metadata.userId', match: { value: userId } },
            { key: 'metadata.skillTreeId', match: { value: skillTreeId } },
          ],
        }),
        'search quiz mistakes',
      );
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
    if (this.disabled || chunks.length === 0) return;

    const uploadedAt = new Date().toISOString();
    const docs = chunks.map(
      (chunk, index) =>
        new Document({
          pageContent: chunk,
          metadata: { userId, skillTreeId, type: 'document', chunkIndex: index, uploadedAt },
        }),
    );
    const store = this.getStore('skill_documents');
    await this.withTimeout(store.addDocuments(docs), 'store documents');
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
    if (this.disabled) return [];

    try {
      const store = this.getStore('skill_documents');
      const results = await this.withTimeout(
        store.similaritySearch(query, k, {
          must: [
            { key: 'metadata.userId', match: { value: userId } },
            { key: 'metadata.skillTreeId', match: { value: skillTreeId } },
          ],
        }),
        'search documents',
      );
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

  private async withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
