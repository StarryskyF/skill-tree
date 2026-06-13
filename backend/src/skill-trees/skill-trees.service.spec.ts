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
  };
  const ragService = {
    searchDocuments: jest.fn(),
  };
  const usersService = {};
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
});
