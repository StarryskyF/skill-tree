export interface PathDeviation {
  nodeId: string;
  nodeTitle: string;
  shouldBeAfterTitles: string[];
}

export interface PathAnalysisResult {
  similarityScore: number;
  completedCount: number;
  totalCount: number;
  deviations: PathDeviation[];
  nextRecommended: string[];
  expertPath: string[];
  userPath: string[];
}

interface NodeMeta {
  id: string;
  title: string;
  level: number;
  prerequisites: string[];
}

function buildExpertPath(nodes: NodeMeta[]): string[] {
  return [...nodes].sort((a, b) => a.level - b.level).map((n) => n.id);
}

function lcs(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function analyzePathSimilarity(
  nodes: NodeMeta[],
  completedNodes: string[],
): PathAnalysisResult {
  const expertPath = buildExpertPath(nodes);
  const userPath = completedNodes.filter((id) => expertPath.includes(id));

  const totalCount = expertPath.length;
  const completedCount = userPath.length;

  const similarityScore =
    totalCount === 0 ? 100 : Math.round((lcs(expertPath, userPath) / totalCount) * 100);

  // Find deviations: completed nodes that appear out of order vs expert path
  const expertIndex = new Map(expertPath.map((id, i) => [id, i]));
  const deviations: PathDeviation[] = [];

  for (let i = 1; i < userPath.length; i++) {
    const curr = userPath[i];
    const prev = userPath[i - 1];
    const currIdx = expertIndex.get(curr) ?? 0;
    const prevIdx = expertIndex.get(prev) ?? 0;
    if (currIdx < prevIdx) {
      const node = nodes.find((n) => n.id === curr);
      const shouldBeAfter = nodes
        .filter((n) => (expertIndex.get(n.id) ?? 0) < currIdx && completedNodes.includes(n.id))
        .map((n) => n.title)
        .slice(0, 3);
      if (node) {
        deviations.push({ nodeId: curr, nodeTitle: node.title, shouldBeAfterTitles: shouldBeAfter });
      }
    }
  }

  // Recommend next nodes: available (all prereqs in completedSet) and not yet completed, in expert order
  const completedSet = new Set(completedNodes);
  const nextRecommended = expertPath
    .filter((id) => {
      if (completedSet.has(id)) return false;
      const node = nodes.find((n) => n.id === id);
      return node?.prerequisites.every((p) => completedSet.has(p)) ?? false;
    })
    .slice(0, 3);

  return { similarityScore, completedCount, totalCount, deviations, nextRecommended, expertPath, userPath };
}
