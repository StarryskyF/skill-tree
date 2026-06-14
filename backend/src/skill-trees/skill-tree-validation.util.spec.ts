import { validateAndNormalizeSkillTree, SkillTreeValidationError } from './skill-tree-validation.util';
import type { SkillTreeAiResult } from '../ai/ai.service';

function validTree(overrides: Partial<SkillTreeAiResult> = {}): SkillTreeAiResult {
  return {
    title: 'Vue Skill Tree',
    nodes: [
      { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
      { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
      { id: 'node_3', title: 'Routing', description: 'Learn routing', level: 2, prerequisites: ['node_2'], exp: 30 },
    ],
    edges: [
      { id: 'edge_1', source: 'node_1', target: 'node_2' },
      { id: 'edge_2', source: 'node_2', target: 'node_3' },
    ],
    ...overrides,
  };
}

describe('validateAndNormalizeSkillTree', () => {
  it('returns a normalized tree when the graph is valid', () => {
    const result = validateAndNormalizeSkillTree(
      validTree({
        nodes: [
          { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
          {
            id: 'node_2',
            title: 'Components',
            description: 'Learn components',
            level: 1,
            prerequisites: ['node_1', 'node_1'],
            exp: 20,
          },
        ],
        edges: [{ id: 'edge_1', source: 'node_1', target: 'node_2' }],
      }),
    );

    expect(result.nodes[1].prerequisites).toEqual(['node_1']);
    expect(result.edges).toEqual([{ id: 'edge_node_2_1', source: 'node_1', target: 'node_2' }]);
  });

  it('rejects duplicate node ids', () => {
    expect(() =>
      validateAndNormalizeSkillTree(
        validTree({
          nodes: [
            { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: [], exp: 10 },
            { id: 'node_1', title: 'Duplicate', description: 'Duplicate', level: 1, prerequisites: [], exp: 10 },
          ],
          edges: [],
        }),
      ),
    ).toThrow(SkillTreeValidationError);
  });

  it('rejects edges pointing to missing nodes', () => {
    expect(() =>
      validateAndNormalizeSkillTree(
        validTree({
          edges: [
            { id: 'edge_1', source: 'node_1', target: 'node_2' },
            { id: 'edge_2', source: 'node_2', target: 'node_missing' },
          ],
        }),
      ),
    ).toThrow('missing target');
  });

  it('rejects inconsistent edges and prerequisites', () => {
    expect(() =>
      validateAndNormalizeSkillTree(
        validTree({
          edges: [{ id: 'edge_1', source: 'node_1', target: 'node_2' }],
        }),
      ),
    ).toThrow('Missing edge for prerequisite pair: node_2->node_3');
  });

  it('rejects cycles', () => {
    expect(() =>
      validateAndNormalizeSkillTree(
        validTree({
          nodes: [
            { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 0, prerequisites: ['node_3'], exp: 10 },
            { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
            { id: 'node_3', title: 'Routing', description: 'Learn routing', level: 2, prerequisites: ['node_2'], exp: 30 },
          ],
          edges: [
            { id: 'edge_1', source: 'node_3', target: 'node_1' },
            { id: 'edge_2', source: 'node_1', target: 'node_2' },
            { id: 'edge_3', source: 'node_2', target: 'node_3' },
          ],
        }),
      ),
    ).toThrow('cycle');
  });

  it('normalizes levels from prerequisites instead of rejecting flat AI output', () => {
    const result = validateAndNormalizeSkillTree(
      validTree({
        nodes: [
          { id: 'node_1', title: 'Basics', description: 'Learn basics', level: 1, prerequisites: [], exp: 10 },
          { id: 'node_2', title: 'Components', description: 'Learn components', level: 1, prerequisites: ['node_1'], exp: 20 },
          { id: 'node_3', title: 'Routing', description: 'Learn routing', level: 1, prerequisites: ['node_2'], exp: 30 },
        ],
        edges: [
          { id: 'edge_1', source: 'node_1', target: 'node_2' },
          { id: 'edge_2', source: 'node_2', target: 'node_3' },
        ],
      }),
    );

    expect(result.nodes.map((node) => ({ id: node.id, level: node.level }))).toEqual([
      { id: 'node_1', level: 0 },
      { id: 'node_2', level: 1 },
      { id: 'node_3', level: 2 },
    ]);
  });
});
