<script setup lang="ts">
import { useI18n } from '../i18n'

const { locale, toggleLocale, t } = useI18n()
</script>

<template>
  <button
    class="language-toggle"
    type="button"
    :title="t('common.language')"
    @click="toggleLocale"
  >
    {{ locale === 'zh-CN' ? '中' : 'EN' }}
  </button>
</template>

<style scoped>
.language-toggle {
  width: 42px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.language-toggle:hover {
  opacity: 0.8;
  transform: scale(1.04);
}
</style>
