<script setup lang="ts">
import { useThemeStore } from '../stores/theme'
import { useI18n } from '../i18n'

const theme = useThemeStore()
const { t } = useI18n()
</script>

<template>
  <button
    @click="theme.toggle()"
    class="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
    style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-secondary);"
    :title="theme.isDark ? t('common.themeLight') : t('common.themeDark')"
  >
    <span v-if="theme.isDark" class="text-base">☀</span>
    <span v-else class="text-base">☾</span>
  </button>
</template>
