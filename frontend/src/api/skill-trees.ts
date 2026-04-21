import client from './client'

export interface SkillNode {
  id: string
  title: string
  description: string
  level: number
  prerequisites: string[]
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
}

export interface CreateSkillTreeDto {
  goal: string
  currentLevel: string
}

export function createSkillTree(dto: CreateSkillTreeDto) {
  return client.post<SkillTree>('/skill-trees', dto)
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

export function generateQuiz(treeId: string, nodeId: string) {
  return client.post<QuizQuestion[]>(`/skill-trees/${treeId}/nodes/${nodeId}/quiz`, undefined, { timeout: 60000 })
}

export function completeNode(
  treeId: string,
  nodeId: string,
  dto: { quizAnswers: number[]; questions: QuizQuestion[] },
) {
  return client.post<CompleteNodeResult>(`/skill-trees/${treeId}/nodes/${nodeId}/complete`, dto)
}
