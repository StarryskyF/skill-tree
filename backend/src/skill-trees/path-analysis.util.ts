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
  recommendationDetails: RecommendationDetail[];
  expertPath: string[];
  userPath: string[];
}

interface NodeMeta {
  id: string;
  title: string;
  level: number;
  prerequisites: string[];
}

export interface NodeQuizPerformanceMeta {
  nodeId: string;
  attempts?: number;
  passCount?: number;
  failCount?: number;
  consecutiveFailures?: number;
  lastScore?: number;
}

export interface RecommendationDetail {
  nodeId: string;
  nodeTitle: string;
  reasons: string[];
  priority: number;
}

export interface PathRewardBonus {
  baseExp: number;
  bonusExp: number;
  totalExp: number;
  reason?: 'recommended_order';
  similarityScoreAfter: number;
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

export function longestCommonSubsequenceLength(a: string[], b: string[]): number {
  return lcs(a, b);
}

export function calculatePathRewardBonus(
  nodes: Array<NodeMeta & { exp?: number }>,
  completedNodes: string[],
  nodeId: string,
): PathRewardBonus {
  const node = nodes.find((item) => item.id === nodeId);
  const baseExp = node?.exp ?? 10;
  const before = analyzePathSimilarity(nodes, completedNodes);
  const afterCompleted = [...new Set([...completedNodes, nodeId])];
  const after = analyzePathSimilarity(nodes, afterCompleted);
  const completedSet = new Set(completedNodes);
  const nextInReferencePath = before.expertPath.find((id) => !completedSet.has(id));
  const followsReferencePath = nextInReferencePath === nodeId && after.similarityScore >= before.similarityScore;
  const bonusExp = followsReferencePath ? Math.max(1, Math.round(baseExp * 0.2)) : 0;

  return {
    baseExp,
    bonusExp,
    totalExp: baseExp + bonusExp,
    reason: bonusExp > 0 ? 'recommended_order' : undefined,
    similarityScoreAfter: after.similarityScore,
  };
}

export function analyzePathSimilarity(
  nodes: NodeMeta[],
  completedNodes: string[],
  quizPerformance: NodeQuizPerformanceMeta[] = [],
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
  const performanceByNode = new Map(quizPerformance.map((item) => [item.nodeId, item]));
  const recommendationDetails = expertPath
    .filter((id) => {
      if (completedSet.has(id)) return false;
      const node = nodes.find((n) => n.id === id);
      return node?.prerequisites.every((p) => completedSet.has(p)) ?? false;
    })
    .map((id) => buildRecommendationDetail(id, nodes, performanceByNode, completedSet, expertIndex))
    .sort((a, b) => b.priority - a.priority || (expertIndex.get(a.nodeId) ?? 0) - (expertIndex.get(b.nodeId) ?? 0))
    .slice(0, 3);
  const nextRecommended = recommendationDetails.map((detail) => detail.nodeId);

  return { similarityScore, completedCount, totalCount, deviations, nextRecommended, recommendationDetails, expertPath, userPath };
}

function buildRecommendationDetail(
  id: string,
  nodes: NodeMeta[],
  performanceByNode: Map<string, NodeQuizPerformanceMeta>,
  completedSet: Set<string>,
  expertIndex: Map<string, number>,
): RecommendationDetail {
  const node = nodes.find((n) => n.id === id);
  const performance = performanceByNode.get(id);
  const reasons: string[] = [];
  let priority = 10;

  if ((performance?.consecutiveFailures ?? 0) >= 2) {
    priority += 100;
    reasons.push('retryAfterFailures');
  } else if ((performance?.failCount ?? 0) > 0) {
    priority += 60;
    reasons.push('pastMistakes');
  } else {
    reasons.push('unlocked');
  }

  const weakPrerequisites = (node?.prerequisites ?? [])
    .map((prerequisiteId) => ({ prerequisiteId, performance: performanceByNode.get(prerequisiteId) }))
    .filter((item) => (item.performance?.failCount ?? 0) > (item.performance?.passCount ?? 0));
  if (weakPrerequisites.length > 0) {
    priority += 25;
    reasons.push('weakPrerequisites');
  }

  const prerequisitesCompleted = (node?.prerequisites ?? []).filter((prerequisite) => completedSet.has(prerequisite)).length;
  if (prerequisitesCompleted > 0) {
    reasons.push('prerequisitesComplete');
  }

  return {
    nodeId: id,
    nodeTitle: node?.title ?? id,
    reasons,
    priority: priority - (expertIndex.get(id) ?? 0),
  };
}
