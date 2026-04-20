<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import { getSkillTree, getNodeStatuses } from '../../../api/skill-trees'
import type { SkillTree, SkillNode, NodeStatus } from '../../../api/skill-trees'
import ThemeToggle from '../../../components/ThemeToggle.vue'
import SkillTreeNode from './components/SkillTreeNode.vue'
import QuizModal from './components/QuizModal.vue'

const route = useRoute()
const router = useRouter()
const skillTree = ref<SkillTree | null>(null)
const loading = ref(true)
const error = ref('')
const nodeStatuses = ref<Record<string, NodeStatus>>({})
const quizModalNodeId = ref<string | null>(null)

const quizModalNode = computed(() =>
  quizModalNodeId.value
    ? skillTree.value?.nodes.find((n) => n.id === quizModalNodeId.value) ?? null
    : null,
)

const nodeTypes = { skillNode: SkillTreeNode }

function layoutNodes(nodes: SkillNode[]) {
  const byLevel: Record<number, SkillNode[]> = {}
  for (const n of nodes) {
    ;(byLevel[n.level] ??= []).push(n)
  }
  const result = []
  for (const [lvl, group] of Object.entries(byLevel)) {
    const level = Number(lvl)
    const count = group.length
    group.forEach((n, i) => {
      result.push({
        id: n.id,
        type: 'skillNode',
        position: {
          x: level * 240,
          y: (i - (count - 1) / 2) * 150,
        },
        data: {
          id: n.id,
          title: n.title,
          description: n.description,
          level: n.level,
          status: (nodeStatuses.value[n.id] ?? 'available') as NodeStatus,
        },
      })
    })
  }
  return result
}

const flowNodes = computed(() => (skillTree.value ? layoutNodes(skillTree.value.nodes) : []))

const flowEdges = computed(() =>
  (skillTree.value?.edges ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
  })),
)

onMounted(async () => {
  try {
    const treeId = route.params.id as string
    const [treeRes, statusRes] = await Promise.all([
      getSkillTree(treeId),
      getNodeStatuses(treeId),
    ])
    if (!treeRes.data) throw new Error('数据为空')
    skillTree.value = treeRes.data
    if (statusRes.data) nodeStatuses.value = statusRes.data
  } catch {
    error.value = '技能树加载失败'
  } finally {
    loading.value = false
  }
})

function onNodeClick({ node }: { node: { id: string; data: { status: NodeStatus } } }) {
  if (node.data.status === 'available') {
    quizModalNodeId.value = node.id
  }
}

function onQuizComplete(newStatuses: Record<string, NodeStatus>) {
  nodeStatuses.value = newStatuses
  quizModalNodeId.value = null
}

function onQuizClose() {
  quizModalNodeId.value = null
}
</script>

<template>
  <div class="detail-page">
    <!-- Navbar -->
    <nav class="detail-nav">
      <div class="detail-nav__left">
        <div class="detail-nav__logo" @click="router.push('/')">🌳</div>
        <span class="detail-nav__brand">Skill Tree</span>
        <span class="detail-nav__sep">/</span>
        <span class="detail-nav__title">{{ skillTree?.title || '加载中...' }}</span>
      </div>
      <div class="detail-nav__right">
        <ThemeToggle />
        <button class="detail-nav__back" @click="router.push('/skill-trees')">← 返回列表</button>
      </div>
    </nav>

    <!-- Info bar -->
    <div v-if="skillTree" class="detail-info">
      <div class="detail-info__meta">
        <span class="detail-info__goal">目标：{{ skillTree.goal }}</span>
        <span class="detail-info__dot">·</span>
        <span class="detail-info__level">水平：{{ skillTree.currentLevel }}</span>
      </div>
      <div class="detail-info__stats">
        <span>{{ skillTree.nodes.length }} 个节点</span>
        <span class="detail-info__dot">·</span>
        <span>{{ skillTree.edges.length }} 条依赖</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="detail-state">
      <div class="detail-state__spinner"></div>
      <p>加载技能树...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="detail-state">
      <p class="detail-state__error">{{ error }}</p>
      <button class="detail-state__btn" @click="router.push('/skill-trees')">返回列表</button>
    </div>

    <!-- Vue Flow Canvas -->
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
    </div>

    <QuizModal
      v-if="quizModalNodeId && quizModalNode"
      :tree-id="(route.params.id as string)"
      :node-id="quizModalNodeId"
      :node-title="quizModalNode.title"
      @complete="onQuizComplete"
      @close="onQuizClose"
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
  font-size: 16px;
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

.detail-nav__back {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background-color: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: opacity 0.2s;
}

.detail-nav__back:hover {
  opacity: 0.75;
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
}

.detail-flow {
  width: 100%;
  height: 100%;
  background-color: var(--bg-page);
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
