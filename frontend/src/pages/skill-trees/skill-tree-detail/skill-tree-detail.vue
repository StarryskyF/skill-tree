<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import { getSkillTree, getNodeStatuses, getPathAnalysis } from '../../../api/skill-trees'
import type { SkillTree, SkillNode, NodeStatus, QuizSession, CompleteNodeResult, PathAnalysisResult } from '../../../api/skill-trees'
import { useI18n } from '../../../i18n'
import ThemeToggle from '../../../components/ThemeToggle.vue'
import LanguageToggle from '../../../components/LanguageToggle.vue'
import SkillTreeNode from './components/SkillTreeNode.vue'
import QuizModal from './components/QuizModal.vue'
import ChatPanel from './components/ChatPanel.vue'
import PathAnalysisCard from './components/PathAnalysisCard.vue'
import LevelUpOverlay from '../../../components/LevelUpOverlay.vue'
import BadgeUnlockToast from '../../../components/BadgeUnlockToast.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const skillTree = ref<SkillTree | null>(null)
const loading = ref(true)
const error = ref('')
const nodeStatuses = ref<Record<string, NodeStatus>>({})
const quizModalNodeId = ref<string | null>(null)
const nodeQuizCache = ref<Record<string, QuizSession>>({})
const chatOpen = ref(false)
const focusedNodeId = ref<string | null>(null)
const justCompletedNodeId = ref<string | null>(null)
const justUnlockedNodeIds = ref<Set<string>>(new Set())
const levelUpData = ref<{ oldLevel: number; newLevel: number; levelName: string } | null>(null)
const pendingBadges = ref<Array<{ id: string; name: string }>>([])
const pathAnalysis = ref<PathAnalysisResult | null>(null)
const chatPendingMessage = ref<string | undefined>(undefined)

const levelNames = computed(() => [
  '',
  t('detail.beginner'),
  t('detail.explorer'),
  t('detail.practitioner'),
  t('detail.expert'),
  t('detail.master'),
])

const quizModalNode = computed(() =>
  quizModalNodeId.value
    ? skillTree.value?.nodes.find((node) => node.id === quizModalNodeId.value) ?? null
    : null,
)

const nodeTypes = { skillNode: SkillTreeNode as Component }

function layoutNodes(nodes: SkillNode[]) {
  const byLevel: Record<number, SkillNode[]> = {}
  for (const node of nodes) {
    ;(byLevel[node.level] ??= []).push(node)
  }
  const result: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> = []
  for (const [levelValue, group] of Object.entries(byLevel)) {
    const level = Number(levelValue)
    const count = group.length
    group.forEach((node, index) => {
      result.push({
        id: node.id,
        type: 'skillNode',
        position: {
          x: level * 240,
          y: (index - (count - 1) / 2) * 150,
        },
        data: {
          id: node.id,
          title: node.title,
          description: node.description,
          level: node.level,
          exp: node.exp,
          status: (nodeStatuses.value[node.id] ?? 'available') as NodeStatus,
          justCompleted: justCompletedNodeId.value === node.id,
          justUnlocked: justUnlockedNodeIds.value.has(node.id),
        },
      })
    })
  }
  return result
}

const flowNodes = computed(() => (skillTree.value ? layoutNodes(skillTree.value.nodes) : []))

const flowEdges = computed(() =>
  (skillTree.value?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
  })),
)

onMounted(async () => {
  try {
    const treeId = route.params.id as string
    const [treeRes, statusRes, analysisRes] = await Promise.all([
      getSkillTree(treeId),
      getNodeStatuses(treeId),
      getPathAnalysis(treeId),
    ])
    if (!treeRes.data) throw new Error(t('detail.loadFailed'))
    skillTree.value = treeRes.data
    if (statusRes.data) nodeStatuses.value = statusRes.data
    if (analysisRes.data) pathAnalysis.value = analysisRes.data
  } catch {
    error.value = t('detail.loadFailed')
  } finally {
    loading.value = false
  }
})

function onNodeClick({ node }: { node: { id: string; data: { status: NodeStatus } } }) {
  if (node.data.status === 'available') {
    quizModalNodeId.value = node.id
  } else {
    focusedNodeId.value = node.id
    chatOpen.value = true
  }
}

function onQuizComplete(result: CompleteNodeResult) {
  if (quizModalNodeId.value) delete nodeQuizCache.value[quizModalNodeId.value]
  const prevStatuses = { ...nodeStatuses.value }
  nodeStatuses.value = result.newStatuses

  const newlyUnlocked = new Set<string>()
  for (const [id, status] of Object.entries(result.newStatuses)) {
    if (status === 'available' && prevStatuses[id] === 'locked') {
      newlyUnlocked.add(id)
    }
  }
  justUnlockedNodeIds.value = newlyUnlocked

  justCompletedNodeId.value = quizModalNodeId.value
  setTimeout(() => { justCompletedNodeId.value = null }, 1000)
  setTimeout(() => { justUnlockedNodeIds.value = new Set() }, 2000)

  refreshPathAnalysis()

  if (result.leveledUp && result.newLevel) {
    levelUpData.value = {
      oldLevel: result.newLevel - 1,
      newLevel: result.newLevel,
      levelName: levelNames.value[result.newLevel] ?? t('detail.master'),
    }
  }
  if (result.newBadges?.length) {
    pendingBadges.value = result.newBadges
  }
}

function onQuizClose() {
  if (quizModalNodeId.value) delete nodeQuizCache.value[quizModalNodeId.value]
  quizModalNodeId.value = null
}

function onQuizGenerated(quiz: QuizSession) {
  if (quizModalNodeId.value) nodeQuizCache.value[quizModalNodeId.value] = quiz
}

async function refreshPathAnalysis() {
  const treeId = route.params.id as string
  const res = await getPathAnalysis(treeId)
  if (res.data) pathAnalysis.value = res.data
}

function onAskAi(message: string) {
  chatOpen.value = true
  chatPendingMessage.value = message
}

function onHighlightNodes(ids: string[]) {
  ids.forEach((id) => justUnlockedNodeIds.value.add(id))
  setTimeout(() => { justUnlockedNodeIds.value = new Set() }, 2000)
}

const nodeIdToTitle = computed(() => {
  const map: Record<string, string> = {}
  for (const node of skillTree.value?.nodes ?? []) map[node.id] = node.title
  return map
})
</script>

<template>
  <div class="detail-page">
    <nav class="detail-nav">
      <div class="detail-nav__left">
        <div class="detail-nav__logo" @click="router.push('/')">ST</div>
        <span class="detail-nav__brand">{{ t('common.appName') }}</span>
        <span class="detail-nav__sep">/</span>
        <span class="detail-nav__title">{{ skillTree?.title || t('detail.loadingTitle') }}</span>
      </div>
      <div class="detail-nav__right">
        <LanguageToggle />
        <ThemeToggle />
        <button class="detail-nav__chat" :class="{ active: chatOpen }" @click="chatOpen = !chatOpen">
          {{ t('detail.aiChat') }}
        </button>
        <button class="detail-nav__back" @click="router.push('/skill-trees')">{{ t('common.backList') }}</button>
      </div>
    </nav>

    <div v-if="skillTree" class="detail-info">
      <div class="detail-info__meta">
        <span class="detail-info__goal">{{ t('detail.goal', { goal: skillTree.goal }) }}</span>
        <span class="detail-info__dot">/</span>
        <span class="detail-info__level">{{ t('detail.currentLevel', { level: skillTree.currentLevel }) }}</span>
      </div>
      <div class="detail-info__stats">
        <span>{{ skillTree.completedNodes.length }}/{{ skillTree.nodes.length }} {{ t('detail.completed') }}</span>
        <span class="detail-info__dot">/</span>
        <span>
          {{ skillTree.nodes.filter((node) => skillTree!.completedNodes.includes(node.id)).reduce((sum, node) => sum + (node.exp ?? 10), 0) }}
          /
          {{ skillTree.nodes.reduce((sum, node) => sum + (node.exp ?? 10), 0) }} EXP
        </span>
      </div>
    </div>

    <div v-if="loading" class="detail-state">
      <div class="detail-state__spinner"></div>
      <p>{{ t('detail.loadingTree') }}</p>
    </div>

    <div v-else-if="error" class="detail-state">
      <p class="detail-state__error">{{ error }}</p>
      <button class="detail-state__btn" @click="router.push('/skill-trees')">{{ t('common.backList') }}</button>
    </div>

    <div v-else class="detail-canvas">
      <VueFlow
        :nodes="flowNodes"
        :edges="flowEdges"
        :node-types="nodeTypes"
        :fit-view-on-init="true"
        :min-zoom="0.3"
        :max-zoom="2"
        class="detail-flow"
        @node-click="onNodeClick"
      >
        <Background pattern-color="var(--border-color)" :gap="20" />
        <Controls />
      </VueFlow>
      <div v-if="chatOpen && skillTree" class="detail-side">
        <PathAnalysisCard
          v-if="pathAnalysis"
          :analysis="pathAnalysis"
          :node-id-to-title="nodeIdToTitle"
          @ask-ai="onAskAi"
          @highlight-nodes="onHighlightNodes"
        />
        <ChatPanel
          :skill-tree-id="skillTree._id"
          :focused-node-id="focusedNodeId"
          :pending-message="chatPendingMessage"
          @message-consumed="chatPendingMessage = undefined"
        />
      </div>
    </div>

    <QuizModal
      v-if="quizModalNodeId && quizModalNode"
      :tree-id="(route.params.id as string)"
      :node-id="quizModalNodeId"
      :node-title="quizModalNode.title"
      :initial-quiz="nodeQuizCache[quizModalNodeId]"
      @complete="onQuizComplete"
      @close="onQuizClose"
      @quiz-generated="onQuizGenerated"
    />

    <LevelUpOverlay
      v-if="levelUpData"
      :old-level="levelUpData.oldLevel"
      :new-level="levelUpData.newLevel"
      :level-name="levelUpData.levelName"
      @close="levelUpData = null"
    />

    <BadgeUnlockToast
      v-if="pendingBadges.length"
      :badges="pendingBadges"
      @close="pendingBadges = []"
    />
  </div>
</template>

<style scoped>
.detail-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page);
}

.detail-nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.detail-nav__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-nav__logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  color: white;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  cursor: pointer;
}

.detail-nav__brand {
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
}

.detail-nav__sep {
  color: var(--text-muted);
}

.detail-nav__title {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-nav__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-nav__back,
.detail-nav__chat {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background-color: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.detail-nav__back:hover,
.detail-nav__chat:hover {
  opacity: 0.75;
}

.detail-nav__chat.active {
  background-color: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.detail-info {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.detail-info__meta,
.detail-info__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.detail-info__dot {
  opacity: 0.4;
}

.detail-canvas {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.detail-flow {
  flex: 1;
  height: 100%;
  background-color: var(--bg-page);
}

.detail-side {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  overflow: hidden;
}

.detail-side :deep(.chat-panel) {
  border-left: none;
  flex: 1;
  min-height: 0;
}

.detail-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.detail-state__spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid var(--border-color);
  border-top-color: #7c3aed;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.detail-state__error {
  color: #ef4444;
}

.detail-state__btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  background-color: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
}
</style>
