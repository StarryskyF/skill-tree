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
}

export interface CompleteNodeResult {
  passed: boolean
  score: number
  newStatuses: Record<string, NodeStatus>
  expGained?: number
  newExp?: number
  newLevel?: number
  leveledUp?: boolean
  newBadges?: Array<{ id: string; name: string }>
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

export function generateQuiz(treeId: string, nodeId: string, language?: 'zh-CN' | 'en-US') {
  return client.post<QuizQuestion[]>(`/skill-trees/${treeId}/nodes/${nodeId}/quiz`, { language }, { timeout: 60000 })
}

export function completeNode(
  treeId: string,
  nodeId: string,
  dto: { quizAnswers: number[]; questions: QuizQuestion[] },
) {
  return client.post<CompleteNodeResult>(`/skill-trees/${treeId}/nodes/${nodeId}/complete`, dto)
}

export function getPathAnalysis(treeId: string) {
  return client.get<PathAnalysisResult>(`/skill-trees/${treeId}/path-analysis`)
}
