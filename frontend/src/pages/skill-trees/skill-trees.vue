<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getSkillTrees, deleteSkillTree } from '../../api/skill-trees'
import type { SkillTree } from '../../api/skill-trees'
import { useI18n } from '../../i18n'
import ThemeToggle from '../../components/ThemeToggle.vue'
import LanguageToggle from '../../components/LanguageToggle.vue'
import SkillTreeCard from './components/SkillTreeCard.vue'
import CreateSkillTreeModal from './components/CreateSkillTreeModal.vue'

const router = useRouter()
const { t } = useI18n()
const skillTrees = ref<SkillTree[]>([])
const loading = ref(true)
const showCreateModal = ref(false)

async function loadSkillTrees() {
  loading.value = true
  try {
    const res = await getSkillTrees()
    skillTrees.value = res.data ?? []
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm(t('trees.deleteMessage'), t('trees.deleteTitle'), {
      confirmButtonText: t('trees.deleteConfirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    })
    await deleteSkillTree(id)
    ElMessage.success(t('trees.deleteSuccess'))
    skillTrees.value = skillTrees.value.filter((tree) => tree._id !== id)
  } catch {
    // User cancelled or request failed.
  }
}

function handleEnter(id: string) {
  router.push(`/skill-trees/${id}`)
}

function handleCreateSuccess() {
  showCreateModal.value = false
  loadSkillTrees()
}

onMounted(loadSkillTrees)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-page);">
    <nav
      class="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur-sm"
      style="background-color: var(--bg-card); border-bottom: 1px solid var(--border-color);"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white cursor-pointer"
          style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          @click="router.push('/')"
        >
          ST
        </div>
        <span class="font-bold text-base" style="color: var(--text-primary);">{{ t('common.appName') }}</span>
      </div>
      <div class="flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
        <button
          @click="router.push('/')"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          {{ t('common.backHome') }}
        </button>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary);">{{ t('trees.title') }}</h1>
          <p class="text-sm mt-1" style="color: var(--text-muted);">{{ t('trees.subtitle') }}</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
          style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white;"
        >
          <span>+</span>
          <span>{{ t('trees.create') }}</span>
        </button>
      </div>

      <div v-if="loading" class="grid md:grid-cols-2 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-xl p-5 h-40 animate-pulse"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color);"
        />
      </div>

      <div v-else-if="skillTrees.length === 0" class="flex flex-col items-center justify-center py-24 gap-4">
        <div
          class="w-20 h-20 rounded-2xl flex items-center justify-center text-lg font-black"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); color: #8b5cf6;"
        >
          ST
        </div>
        <p class="text-base font-medium" style="color: var(--text-primary);">{{ t('trees.emptyTitle') }}</p>
        <p class="text-sm" style="color: var(--text-muted);">{{ t('trees.emptyDesc') }}</p>
        <button
          @click="showCreateModal = true"
          class="mt-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
          style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white;"
        >
          {{ t('trees.emptyAction') }}
        </button>
      </div>

      <div v-else class="grid md:grid-cols-2 gap-4">
        <SkillTreeCard
          v-for="tree in skillTrees"
          :key="tree._id"
          :skill-tree="tree"
          @delete="handleDelete"
          @enter="handleEnter"
        />
      </div>
    </main>

    <CreateSkillTreeModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @success="handleCreateSuccess"
    />
  </div>
</template>
