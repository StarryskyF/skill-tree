import { SkillTreesService } from './skill-trees.service';
import type { SkillTreeAiResult } from '../ai/ai.service';

function tree(edges: SkillTreeAiResult['edges']): SkillTreeAiResult {
  return {
    title: 'Vue Skill Tree',
    nodes: [
      { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
      { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
    ],
    edges,
  };
}

describe('SkillTreesService generation validation', () => {
  const skillTreeModel = {
    findByIdAndUpdate: jest.fn(),
  };
  const aiService = {
    generateSkillTree: jest.fn(),
    generateQuiz: jest.fn(),
  };
  const ragService = {
    searchDocuments: jest.fn(),
    searchLearningMemory: jest.fn(),
    storeQuizMistakes: jest.fn().mockResolvedValue(undefined),
  };
  const usersService = {
    addExp: jest.fn(),
  };
  const evaluationService = {
    recordEvent: jest.fn(),
  };

  let service: SkillTreesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SkillTreesService(
      skillTreeModel as any,
      aiService as any,
      ragService as any,
      usersService as any,
      evaluationService as any,
    );
  });

  it('retries generation when structural validation fails', async () => {
    aiService.generateSkillTree
      .mockResolvedValueOnce(tree([]))
      .mockResolvedValueOnce(tree([{ id: 'edge_1', source: 'node_1', target: 'node_2' }]));

    await (service as any).runGeneration('tree-1', 'user-1', 'Learn Vue', 'beginner', false, 'en-US');

    expect(aiService.generateSkillTree).toHaveBeenCalledTimes(2);
    expect(skillTreeModel.findByIdAndUpdate).toHaveBeenCalledWith('tree-1', {
      status: 'ready',
      title: 'Vue Skill Tree',
      nodes: [
        { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
        { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
      ],
      edges: [{ id: 'edge_node_2_1', source: 'node_1', target: 'node_2' }],
    });
  });

  it('uses learning memory when generating node quizzes', async () => {
    const serviceAny = service as any;
    serviceAny.findOne = jest.fn().mockResolvedValue({
      goal: 'Learn Vue',
      language: 'en-US',
      completedNodes: [],
      pendingQuizSessions: [],
      nodes: [
        { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
      ],
    });
    ragService.searchLearningMemory.mockResolvedValue({
      mistakes: [{ content: 'Past mistake about component props', sourceType: 'mistake', metadata: {} }],
      documents: [{ content: 'Uploaded note about Vue props', sourceType: 'document', metadata: {} }],
      totalHits: 2,
    });
    aiService.generateQuiz.mockResolvedValue([
      { question: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      { question: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      { question: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
    ]);

    const result = await service.generateNodeQuiz('user-1', 'tree-1', 'node_1', 'en-US');

    expect(ragService.searchLearningMemory).toHaveBeenCalledWith({
      userId: 'user-1',
      skillTreeId: 'tree-1',
      query: 'Basics\nLearn basics',
      mistakeLimit: 3,
      documentLimit: 3,
    });
    expect(aiService.generateQuiz).toHaveBeenCalledWith(
      'Basics',
      'Learn basics',
      'Learn Vue',
      'en-US',
      expect.stringContaining('Past mistake about component props'),
    );
    expect(evaluationService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rag_retrieved',
        metadata: expect.objectContaining({
          interaction: 'quiz_generation',
          mistakeHits: 1,
          documentHits: 1,
          totalHits: 2,
        }),
      }),
    );
    expect(result.quizSessionId).toEqual(expect.any(String));
    expect(result.questions).toHaveLength(3);
    expect(result.status).toBe('active');
    expect(result.attempts).toBe(0);
    expect(skillTreeModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'tree-1',
      expect.objectContaining({
        pendingQuizSessions: [
          expect.objectContaining({
            id: result.quizSessionId,
            nodeId: 'node_1',
            status: 'active',
            attempts: 0,
            questions: result.questions,
          }),
        ],
      }),
    );
  });

  it('records quiz performance when a quiz fails', async () => {
    const serviceAny = service as any;
    serviceAny.findOne = jest.fn().mockResolvedValue({
      completedNodes: [],
      quizPerformance: [],
      pendingQuizSessions: [
        {
          id: 'quiz-1',
          nodeId: 'node_1',
          status: 'active',
          attempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          questions: [
            { question: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a matches the tested concept.' },
            { question: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a is correct for this scenario.' },
            { question: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a follows the expected usage.' },
          ],
        },
      ],
      nodes: [
        { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
      ],
    });

    const result = await service.completeNode('user-1', 'tree-1', 'node_1', {
      quizSessionId: 'quiz-1',
      quizAnswers: [1, 1, 1],
    });

    expect(result.passed).toBe(false);
    expect(result.review).toHaveLength(3);
    expect(result.review[0]).toEqual(
      expect.objectContaining({
        question: 'q1',
        userAnswer: 'b',
        correctAnswer: 'a',
        explanation: 'Option a matches the tested concept.',
        isCorrect: false,
      }),
    );
    expect(skillTreeModel.findByIdAndUpdate).toHaveBeenCalledWith('tree-1', {
      quizPerformance: [
        expect.objectContaining({
          nodeId: 'node_1',
          attempts: 1,
          failCount: 1,
          passCount: 0,
          consecutiveFailures: 1,
          lastScore: 0,
        }),
      ],
      pendingQuizSessions: [
        expect.objectContaining({
          id: 'quiz-1',
          status: 'failed',
          lastAnswers: [1, 1, 1],
          lastScore: 0,
          attempts: 1,
        }),
      ],
    });
  });

  it('adds path bonus EXP and achievement badges when a quiz passes on the reference path', async () => {
    const serviceAny = service as any;
    serviceAny.findOne = jest.fn().mockResolvedValue({
      title: 'Vue Skill Tree',
      completedNodes: ['node_1'],
      quizPerformance: [],
      pendingQuizSessions: [
        {
          id: 'quiz-2',
          nodeId: 'node_2',
          status: 'active',
          attempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          questions: [
            { question: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a matches the tested concept.' },
            { question: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a is correct for this scenario.' },
            { question: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Option a follows the expected usage.' },
          ],
        },
      ],
      nodes: [
        { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
        { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
      ],
    });
    usersService.addExp.mockResolvedValue({
      newExp: 124,
      newLevel: 2,
      leveledUp: false,
      newBadges: [{ id: 'perfect_quiz', name: '测验全对' }],
    });

    const result = await service.completeNode('user-1', 'tree-1', 'node_2', {
      quizSessionId: 'quiz-2',
      quizAnswers: [0, 0, 0],
    });

    expect(result).toEqual(
      expect.objectContaining({
        passed: true,
        expGained: 24,
        baseExp: 20,
        pathBonusExp: 4,
        review: expect.any(Array),
      }),
    );
    expect(usersService.addExp).toHaveBeenCalledWith(
      'user-1',
      24,
      expect.arrayContaining([
        { id: 'tree_complete_tree-1', name: '完成整棵树：Vue Skill Tree' },
        { id: 'high_similarity_path_tree-1', name: '高相似度路径' },
        { id: 'perfect_quiz', name: '测验全对' },
      ]),
    );
    expect(evaluationService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'exp_gained',
        exp: 24,
        metadata: expect.objectContaining({
          baseExp: 20,
          pathBonusExp: 4,
          pathBonusReason: 'recommended_order',
          similarityScoreAfter: 100,
        }),
      }),
    );
  });
});
