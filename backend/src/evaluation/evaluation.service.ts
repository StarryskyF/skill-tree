import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SkillNode, SkillTree, SkillTreeDocument } from '../skill-trees/schemas/skill-tree.schema';
import { analyzePathSimilarity } from '../skill-trees/path-analysis.util';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  EvaluationEvent,
  EvaluationEventDocument,
  EvaluationEventType,
} from './schemas/evaluation-event.schema';

type TreeStatus = 'generating' | 'ready' | 'failed';

interface StructureMetrics {
  dagValid: boolean;
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  rootNodeCount: number;
  rootNodeRatio: number;
  prerequisiteCoverage: number;
  averageBranchingFactor: number;
  edgeConsistency: number;
  issueCount: number;
  issues: string[];
}

export interface EvaluationTreeRow {
  id: string;
  title: string;
  goal: string;
  status: TreeStatus;
  createdAt?: Date;
  updatedAt?: Date;
  generationDurationMs: number | null;
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  rootNodeRatio: number;
  prerequisiteCoverage: number;
  averageBranchingFactor: number;
  edgeConsistency: number;
  dagValid: boolean;
  structureIssueCount: number;
  structureIssues: string[];
  completedCount: number;
  completionRate: number;
  lcsSimilarityScore: number;
  deviationCount: number;
  recommendedNextCount: number;
  totalExp: number;
  earnedExp: number;
}

@Injectable()
export class EvaluationService {
  constructor(
    @InjectModel(SkillTree.name) private readonly skillTreeModel: Model<SkillTreeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(EvaluationEvent.name) private readonly eventModel: Model<EvaluationEventDocument>,
  ) {}

  async recordEvent(input: {
    userId: string;
    skillTreeId?: string;
    nodeId?: string;
    type: EvaluationEventType;
    score?: number;
    exp?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.eventModel.create({
      ...input,
      metadata: input.metadata ?? {},
    });
  }

  async getSummary(userId: string) {
    const [trees, user, events] = await Promise.all([
      this.skillTreeModel.find({ userId }).lean().exec(),
      this.userModel.findById(userId).lean().exec(),
      this.eventModel.find({ userId }).lean().exec(),
    ]);
    const rows = trees.map((tree) => this.buildTreeRow(tree));
    const readyRows = rows.filter((row) => row.status === 'ready');
    const durations = rows
      .map((row) => row.generationDurationMs)
      .filter((value): value is number => typeof value === 'number' && value >= 0);

    const statusCounts = {
      ready: rows.filter((row) => row.status === 'ready').length,
      generating: rows.filter((row) => row.status === 'generating').length,
      failed: rows.filter((row) => row.status === 'failed').length,
    };
    const eventCounts = countEvents(events.map((event) => event.type as EvaluationEventType));
    const quizAttempts = eventCounts.quiz_passed + eventCounts.quiz_failed;
    const ragRetrievals = events.filter((event) => event.type === 'rag_retrieved');
    const ragHitCount = ragRetrievals.filter((event) => Number(event.metadata?.totalHits ?? 0) > 0).length;
    const quizScores = events
      .filter((event) => event.type === 'quiz_passed' || event.type === 'quiz_failed')
      .map((event) => event.score ?? 0);

    const structureRows = rows.filter((row) => row.nodeCount > 0);
    const summary = {
      totalSkillTrees: rows.length,
      statusCounts,
      generationSuccessRate: percent(statusCounts.ready, rows.length),
      generationFailureRate: percent(statusCounts.failed, rows.length),
      averageGenerationTimeMs: average(durations),
      p95GenerationTimeMs: percentile(durations, 95),
      dagValidityRate: percent(structureRows.filter((row) => row.dagValid).length, structureRows.length),
      averageNodeCount: average(rows.map((row) => row.nodeCount)),
      averageEdgeCount: average(rows.map((row) => row.edgeCount)),
      averageMaxDepth: average(rows.map((row) => row.maxDepth)),
      averageRootNodeRatio: average(rows.map((row) => row.rootNodeRatio)),
      averagePrerequisiteCoverage: average(rows.map((row) => row.prerequisiteCoverage)),
      averageBranchingFactor: average(rows.map((row) => row.averageBranchingFactor)),
      averageEdgeConsistency: average(rows.map((row) => row.edgeConsistency)),
      averageCompletionRate: average(readyRows.map((row) => row.completionRate)),
      averageLcsSimilarityScore: average(readyRows.map((row) => row.lcsSimilarityScore)),
      totalCompletedNodes: sum(rows.map((row) => row.completedCount)),
      totalPossibleNodes: sum(rows.map((row) => row.nodeCount)),
      totalEarnedExp: sum(rows.map((row) => row.earnedExp)),
      totalAvailableExp: sum(rows.map((row) => row.totalExp)),
      userLevel: user?.level ?? 1,
      userExp: user?.exp ?? 0,
      userBadgeCount: user?.badges?.length ?? 0,
      userStreakDays: user?.streakDays ?? 0,
      eventCounts,
      quizAttempts,
      quizPassRate: percent(eventCounts.quiz_passed, quizAttempts),
      averageQuizScore: average(quizScores),
      nodeCompletionEvents: eventCounts.node_completed,
      expGainEvents: eventCounts.exp_gained,
      badgeUnlockEvents: eventCounts.badge_unlocked,
      ragRetrievalCount: eventCounts.rag_retrieved,
      ragHitRate: percent(ragHitCount, ragRetrievals.length),
      distributions: {
        lcsScores: bucketScores(readyRows.map((row) => row.lcsSimilarityScore)),
        completionRates: bucketScores(readyRows.map((row) => row.completionRate)),
        nodeCounts: bucketNodeCounts(rows.map((row) => row.nodeCount)),
        quizScores: bucketQuizScores(quizScores),
      },
    };

    return summary;
  }

  async getSkillTrees(userId: string): Promise<EvaluationTreeRow[]> {
    const trees = await this.skillTreeModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return trees.map((tree) => this.buildTreeRow(tree));
  }

  private buildTreeRow(tree: any): EvaluationTreeRow {
    const nodes = (tree.nodes ?? []) as SkillNode[];
    const completedNodes = tree.completedNodes ?? [];
    const structure = analyzeStructure(nodes, tree.edges ?? []);
    const path = analyzePathSimilarity(nodes, completedNodes);
    const totalExp = sum(nodes.map((node) => node.exp ?? 10));
    const completedSet = new Set(completedNodes);
    const earnedExp = sum(nodes.filter((node) => completedSet.has(node.id)).map((node) => node.exp ?? 10));
    const createdAt = tree.createdAt ? new Date(tree.createdAt) : undefined;
    const updatedAt = tree.updatedAt ? new Date(tree.updatedAt) : undefined;

    return {
      id: String(tree._id),
      title: tree.title || 'Untitled skill tree',
      goal: tree.goal,
      status: tree.status,
      createdAt,
      updatedAt,
      generationDurationMs: createdAt && updatedAt && tree.status !== 'generating'
        ? Math.max(0, updatedAt.getTime() - createdAt.getTime())
        : null,
      nodeCount: structure.nodeCount,
      edgeCount: structure.edgeCount,
      maxDepth: structure.maxDepth,
      rootNodeRatio: structure.rootNodeRatio,
      prerequisiteCoverage: structure.prerequisiteCoverage,
      averageBranchingFactor: structure.averageBranchingFactor,
      edgeConsistency: structure.edgeConsistency,
      dagValid: structure.dagValid,
      structureIssueCount: structure.issueCount,
      structureIssues: structure.issues,
      completedCount: path.completedCount,
      completionRate: percent(path.completedCount, path.totalCount),
      lcsSimilarityScore: path.similarityScore,
      deviationCount: path.deviations.length,
      recommendedNextCount: path.nextRecommended.length,
      totalExp,
      earnedExp,
    };
  }
}

function analyzeStructure(nodes: SkillNode[], edges: Array<{ source: string; target: string }>): StructureMetrics {
  const issues: string[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  });

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) issues.push(`Edge source missing: ${edge.source}`);
    if (!nodeIds.has(edge.target)) issues.push(`Edge target missing: ${edge.target}`);
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
  }

  for (const node of nodes) {
    for (const prereq of node.prerequisites ?? []) {
      if (!nodeIds.has(prereq)) issues.push(`Prerequisite missing: ${node.id} -> ${prereq}`);
    }
  }

  const prerequisitePairs = new Set(
    nodes.flatMap((node) => (node.prerequisites ?? []).map((prereq) => `${prereq}->${node.id}`)),
  );
  const edgePairs = new Set(edges.map((edge) => `${edge.source}->${edge.target}`));
  const matchingPairs = [...edgePairs].filter((pair) => prerequisitePairs.has(pair)).length;
  const expectedPairs = prerequisitePairs.size;
  const edgeConsistency = expectedPairs === 0 ? (edges.length === 0 ? 100 : 0) : percent(matchingPairs, expectedPairs);

  const cycleDetected = hasCycle(nodes.map((node) => node.id), adjacency);
  if (cycleDetected) issues.push('Cycle detected');

  const rootNodeCount = nodes.filter((node) => (node.prerequisites ?? []).length === 0).length;
  const nonRootCount = nodes.length - rootNodeCount;
  const prerequisiteCoverage = percent(nodes.filter((node) => (node.prerequisites ?? []).length > 0).length, nodes.length);
  const averageBranchingFactor = nodes.length === 0 ? 0 : round(edges.length / nodes.length);

  return {
    dagValid: issues.length === 0 && !cycleDetected,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    maxDepth: computeMaxDepth(nodes),
    rootNodeCount,
    rootNodeRatio: percent(rootNodeCount, nodes.length),
    prerequisiteCoverage: nonRootCount === 0 ? 0 : prerequisiteCoverage,
    averageBranchingFactor,
    edgeConsistency,
    issueCount: issues.length,
    issues,
  };
}

function hasCycle(nodeIds: string[], adjacency: Map<string, string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return nodeIds.some((id) => dfs(id));
}

function computeMaxDepth(nodes: SkillNode[]): number {
  if (nodes.length === 0) return 0;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const memo = new Map<string, number>();

  const depth = (id: string, seen = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id) ?? 0;
    if (seen.has(id)) return 0;
    const node = byId.get(id);
    if (!node || node.prerequisites.length === 0) return 1;
    const nextSeen = new Set(seen).add(id);
    const value = 1 + Math.max(...node.prerequisites.map((prereq) => depth(prereq, nextSeen)));
    memo.set(id, value);
    return value;
  };

  return Math.max(...nodes.map((node) => depth(node.id)));
}

function bucketScores(values: number[]) {
  const buckets = [
    { label: '0-20', count: 0 },
    { label: '21-40', count: 0 },
    { label: '41-60', count: 0 },
    { label: '61-80', count: 0 },
    { label: '81-100', count: 0 },
  ];
  values.forEach((value) => {
    const index = value <= 20 ? 0 : value <= 40 ? 1 : value <= 60 ? 2 : value <= 80 ? 3 : 4;
    buckets[index].count++;
  });
  return buckets;
}

function bucketNodeCounts(values: number[]) {
  const buckets = [
    { label: '0', count: 0 },
    { label: '1-5', count: 0 },
    { label: '6-10', count: 0 },
    { label: '11-15', count: 0 },
    { label: '16+', count: 0 },
  ];
  values.forEach((value) => {
    const index = value === 0 ? 0 : value <= 5 ? 1 : value <= 10 ? 2 : value <= 15 ? 3 : 4;
    buckets[index].count++;
  });
  return buckets;
}

function bucketQuizScores(values: number[]) {
  const buckets = [
    { label: '0/3', count: 0 },
    { label: '1/3', count: 0 },
    { label: '2/3', count: 0 },
    { label: '3/3', count: 0 },
  ];
  values.forEach((value) => {
    const index = Math.max(0, Math.min(3, Math.round(value)));
    buckets[index].count++;
  });
  return buckets;
}

function countEvents(types: EvaluationEventType[]) {
  const counts: Record<EvaluationEventType, number> = {
    tree_created: 0,
    tree_ready: 0,
    tree_failed: 0,
    quiz_passed: 0,
    quiz_failed: 0,
    node_completed: 0,
    exp_gained: 0,
    badge_unlocked: 0,
    rag_retrieved: 0,
  };
  types.forEach((type) => {
    counts[type] = (counts[type] ?? 0) + 1;
  });
  return counts;
}

function percent(part: number, total: number): number {
  if (!total) return 0;
  return round((part / total) * 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return round(sum(values) / values.length);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return round(sorted[Math.max(0, Math.min(index, sorted.length - 1))]);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
