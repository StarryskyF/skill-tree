<script setup lang="ts">
import type { SkillTree } from '../../../api/skill-trees'

interface SkillTreeCardProps {
  skillTree: SkillTree
}

const props = defineProps<SkillTreeCardProps>()
const emit = defineEmits<{
  delete: [id: string]
  enter: [id: string]
}>()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div
    class="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01]"
    style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Status badge -->
        <span
          v-if="props.skillTree.status === 'generating'"
          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
          style="background: rgba(251,191,36,0.15); color: #f59e0b;"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"></span>
          生成中
        </span>
        <span
          v-else-if="props.skillTree.status === 'ready'"
          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style="background: rgba(16,185,129,0.15); color: #10b981;"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
          已就绪
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style="background: rgba(239,68,68,0.15); color: #ef4444;"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
          生成失败
        </span>
      </div>
      <span class="text-xs flex-shrink-0" style="color: var(--text-muted);">
        {{ formatDate(props.skillTree.createdAt) }}
      </span>
    </div>

    <!-- Title -->
    <div>
      <h3 class="font-semibold text-base mb-1" style="color: var(--text-primary);">
        {{ props.skillTree.status === 'ready' ? props.skillTree.title : props.skillTree.goal }}
      </h3>
      <p class="text-sm line-clamp-1" style="color: var(--text-muted);">
        目标：{{ props.skillTree.goal }}
      </p>
      <p class="text-sm line-clamp-1 mt-0.5" style="color: var(--text-muted);">
        水平：{{ props.skillTree.currentLevel }}
      </p>
    </div>

    <!-- Stats row (only when ready) -->
    <div v-if="props.skillTree.status === 'ready'" class="flex items-center gap-3">
      <span class="text-xs" style="color: var(--text-secondary);">
        <span class="font-semibold" style="color: var(--text-primary);">{{ props.skillTree.nodes.length }}</span> 个节点
      </span>
      <span class="text-xs" style="color: var(--text-secondary);">
        <span class="font-semibold" style="color: var(--text-primary);">{{ props.skillTree.edges.length }}</span> 条依赖
      </span>
    </div>

    <!-- Generating skeleton -->
    <div v-if="props.skillTree.status === 'generating'" class="flex flex-col gap-1.5">
      <div class="h-2 rounded-full animate-pulse" style="background-color: var(--bg-input); width: 80%;"></div>
      <div class="h-2 rounded-full animate-pulse" style="background-color: var(--bg-input); width: 60%;"></div>
    </div>

    <!-- Error message -->
    <p v-if="props.skillTree.status === 'failed'" class="text-xs" style="color: #ef4444;">
      {{ props.skillTree.errorMessage || '生成失败，请重试' }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2 mt-auto pt-1">
      <button
        v-if="props.skillTree.status === 'ready'"
        @click="emit('enter', props.skillTree._id)"
        class="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80 cursor-pointer"
        style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white;"
      >
        进入学习
      </button>
      <button
        @click="emit('delete', props.skillTree._id)"
        class="px-3 py-1.5 rounded-lg text-sm transition-all duration-200 hover:opacity-80 cursor-pointer"
        style="background-color: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-color);"
      >
        删除
      </button>
    </div>
  </div>
</template>
