import { RagService } from './rag.service';

describe('RagService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'test-key';
      if (key === 'QDRANT_URL') return 'http://localhost:6333';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores quiz mistakes with structured metadata', async () => {
    const addDocuments = jest.fn().mockResolvedValue(undefined);
    const service = new RagService(config as any);
    jest.spyOn(service as any, 'getStore').mockReturnValue({ addDocuments });

    await service.storeQuizMistakes('user-1', 'tree-1', 'node-1', 'Components', [
      {
        question: 'What is a component?',
        userAnswer: 'A CSS file',
        correctAnswer: 'A reusable UI unit',
      },
    ]);

    expect(addDocuments).toHaveBeenCalledTimes(1);
    const docs = addDocuments.mock.calls[0][0];
    expect(docs).toHaveLength(1);
    expect(docs[0].pageContent).toContain('What is a component?');
    expect(docs[0].metadata).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        skillTreeId: 'tree-1',
        nodeId: 'node-1',
        nodeTitle: 'Components',
        question: 'What is a component?',
        userAnswer: 'A CSS file',
        correctAnswer: 'A reusable UI unit',
        type: 'quiz_mistake',
      }),
    );
    expect(docs[0].metadata.occurredAt).toEqual(expect.any(String));
  });

  it('returns detailed memory results and falls back on search failure', async () => {
    const service = new RagService(config as any);
    jest.spyOn(service as any, 'getStore').mockReturnValue({
      similaritySearch: jest.fn().mockRejectedValue(new Error('qdrant down')),
    });

    await expect(
      service.searchLearningMemory({ userId: 'user-1', skillTreeId: 'tree-1', query: 'components' }),
    ).resolves.toEqual({ mistakes: [], documents: [], totalHits: 0 });
  });
});
