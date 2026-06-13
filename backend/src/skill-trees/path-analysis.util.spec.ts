import { analyzePathSimilarity } from './path-analysis.util';

const nodes = [
  { id: 'node_1', title: 'Basics', level: 0, prerequisites: [] },
  { id: 'node_2', title: 'Components', level: 1, prerequisites: ['node_1'] },
  { id: 'node_3', title: 'Routing', level: 2, prerequisites: ['node_2'] },
];

describe('analyzePathSimilarity adaptive recommendations', () => {
  it('recommends unlocked nodes with translated reason codes', () => {
    const result = analyzePathSimilarity(nodes, ['node_1']);

    expect(result.nextRecommended).toEqual(['node_2']);
    expect(result.recommendationDetails[0]).toEqual(
      expect.objectContaining({
        nodeId: 'node_2',
        reasons: ['unlocked', 'prerequisitesComplete'],
      }),
    );
  });

  it('prioritizes nodes with repeated quiz failures', () => {
    const result = analyzePathSimilarity(nodes, ['node_1'], [
      { nodeId: 'node_2', attempts: 2, failCount: 2, consecutiveFailures: 2, lastScore: 1 },
    ]);

    expect(result.nextRecommended).toEqual(['node_2']);
    expect(result.recommendationDetails[0].reasons).toContain('retryAfterFailures');
  });

  it('flags weak prerequisite history in recommendation reasons', () => {
    const result = analyzePathSimilarity(nodes, ['node_1', 'node_2'], [
      { nodeId: 'node_2', attempts: 1, failCount: 1, passCount: 0, consecutiveFailures: 0, lastScore: 1 },
    ]);

    expect(result.nextRecommended).toEqual(['node_3']);
    expect(result.recommendationDetails[0].reasons).toContain('weakPrerequisites');
  });
});
