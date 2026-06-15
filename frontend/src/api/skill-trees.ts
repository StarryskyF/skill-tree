import client from './client'

export interface SkillNode {
  id: string
  title: string
  description: string
  level: number
  prerequisites: string[]
  exp: number
}

export interface SkillEdge {
  id: string
  source: string
  target: string
}

export interface SkillTree {
  _id: string
  goal: string
  currentLevel: string
  title: string
  status: 'generating' | 'ready' | 'failed'
  nodes: SkillNode[]
  edges: SkillEdge[]
  completedNodes: string[]
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export type NodeStatus = 'locked' | 'available' | 'completed'

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface QuizReviewItem {
  question: string
  options: string[]
  userAnswerIndex: number
  userAnswer: string
  correctIndex: number
  correctAnswer: string
  explanation: string
  isCorrect: boolean
}

export interface QuizSession {
  quizSessionId: string
  questions: QuizQuestion[]
  status: 'active' | 'failed' | 'passed'
  attempts: number
  lastAnswers?: number[]
  lastScore?: number
  review?: QuizReviewItem[]
}

export interface CompleteNodeResult {
  passed: boolean
  score: number
  newStatuses: Record<string, NodeStatus>
  expGained?: number
  baseExp?: number
  pathBonusExp?: number
  newExp?: number
  newLevel?: number
  leveledUp?: boolean
  newBadges?: Array<{ id: string; name: string }>
  review: QuizReviewItem[]
}

export interface PathDeviation {
  nodeId: string
  nodeTitle: string
  shouldBeAfterTitles: string[]
}

export interface PathAnalysisResult {
  similarityScore: number
  completedCount: number
  totalCount: number
  deviations: PathDeviation[]
  nextRecommended: string[]
  recommendationDetails: Array<{
    nodeId: string
    nodeTitle: string
    reasons: string[]
    priority: number
  }>
  expertPath: string[]
  userPath: string[]
}

export interface CreateSkillTreeDto {
  goal: string
  currentLevel: string
  language?: 'zh-CN' | 'en-US'
}

export function createSkillTree(dto: CreateSkillTreeDto, file?: File) {
  if (!file) return client.post<SkillTree>('/skill-trees', dto)
  const form = new FormData()
  form.append('goal', dto.goal)
  form.append('currentLevel', dto.currentLevel)
  if (dto.language) form.append('language', dto.language)
  form.append('file', file)
  return client.postForm<SkillTree>('/skill-trees', form)
}

export function getSkillTrees() {
  return client.get<SkillTree[]>('/skill-trees')
}

export function getSkillTree(id: string) {
  return client.get<SkillTree>(`/skill-trees/${id}`)
}

export function deleteSkillTree(id: string) {
  return client.del<void>(`/skill-trees/${id}`)
}

export function getNodeStatuses(treeId: string) {
  return client.get<Record<string, NodeStatus>>(`/skill-trees/${treeId}/node-statuses`)
}

export function generateQuiz(treeId: string, nodeId: string, language?: 'zh-CN' | 'en-US', forceRegenerate = false) {
  return client.post<QuizSession>(
    `/skill-trees/${treeId}/nodes/${nodeId}/quiz`,
    { language, forceRegenerate },
    { timeout: 60000 },
  )
}

export function completeNode(
  treeId: string,
  nodeId: string,
  dto: { quizSessionId: string; quizAnswers: number[] },
) {
  return client.post<CompleteNodeResult>(`/skill-trees/${treeId}/nodes/${nodeId}/complete`, dto)
}

export function getPathAnalysis(treeId: string) {
  return client.get<PathAnalysisResult>(`/skill-trees/${treeId}/path-analysis`)
}
