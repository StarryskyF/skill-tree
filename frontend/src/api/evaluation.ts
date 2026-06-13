import client from './client'

export interface EvaluationBucket {
  label: string
  count: number
}

export interface EvaluationSummary {
  totalSkillTrees: number
  statusCounts: {
    ready: number
    generating: number
    failed: number
  }
  generationSuccessRate: number
  generationFailureRate: number
  averageGenerationTimeMs: number
  p95GenerationTimeMs: number
  dagValidityRate: number
  averageNodeCount: number
  averageEdgeCount: number
  averageMaxDepth: number
  averageRootNodeRatio: number
  averagePrerequisiteCoverage: number
  averageBranchingFactor: number
  averageEdgeConsistency: number
  averageCompletionRate: number
  averageLcsSimilarityScore: number
  totalCompletedNodes: number
  totalPossibleNodes: number
  totalEarnedExp: number
  totalAvailableExp: number
  userLevel: number
  userExp: number
  userBadgeCount: number
  userStreakDays: number
  eventCounts: {
    tree_created: number
    tree_ready: number
    tree_failed: number
    quiz_passed: number
    quiz_failed: number
    node_completed: number
    exp_gained: number
    badge_unlocked: number
    rag_retrieved: number
  }
  quizAttempts: number
  quizPassRate: number
  averageQuizScore: number
  nodeCompletionEvents: number
  expGainEvents: number
  badgeUnlockEvents: number
  ragRetrievalCount: number
  ragHitRate: number
  distributions: {
    lcsScores: EvaluationBucket[]
    completionRates: EvaluationBucket[]
    nodeCounts: EvaluationBucket[]
    quizScores: EvaluationBucket[]
  }
}

export interface EvaluationSkillTree {
  id: string
  title: string
  goal: string
  status: 'generating' | 'ready' | 'failed'
  createdAt?: string
  updatedAt?: string
  generationDurationMs: number | null
  nodeCount: number
  edgeCount: number
  maxDepth: number
  rootNodeRatio: number
  prerequisiteCoverage: number
  averageBranchingFactor: number
  edgeConsistency: number
  dagValid: boolean
  structureIssueCount: number
  structureIssues: string[]
  completedCount: number
  completionRate: number
  lcsSimilarityScore: number
  deviationCount: number
  recommendedNextCount: number
  totalExp: number
  earnedExp: number
}

export function getEvaluationSummary() {
  return client.get<EvaluationSummary>('/evaluation/summary')
}

export function getEvaluationSkillTrees() {
  return client.get<EvaluationSkillTree[]>('/evaluation/skill-trees')
}
