<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const theme = useThemeStore()
</script>

<template>
  <button
    @click="theme.toggle()"
    class="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
    style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-secondary);"
    :title="theme.isDark ? '切换为亮色模式' : '切换为暗色模式'"
  >
    <span v-if="theme.isDark" class="text-base">☀️</span>
    <span v-else class="text-base">🌙</span>
  </button>
</template>
