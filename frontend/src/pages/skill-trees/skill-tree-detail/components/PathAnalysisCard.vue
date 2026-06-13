<script setup lang="ts">
import type { PathAnalysisResult } from '../../../../api/skill-trees'
import { useI18n } from '../../../../i18n'

interface Props {
  analysis: PathAnalysisResult
  nodeIdToTitle: Record<string, string>
}
const props = defineProps<Props>()
const emit = defineEmits<{
  askAi: [message: string]
  highlightNodes: [nodeIds: string[]]
}>()
const { locale, t } = useI18n()

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function joinTitles(titles: string[]) {
  return titles.join(locale.value === 'zh-CN' ? '、' : ', ')
}

function onAskAi() {
  const recommended = props.analysis.nextRecommended
    .map((id) => props.nodeIdToTitle[id] ?? id)
    .join(locale.value === 'zh-CN' ? '、' : ', ')
  const msg = recommended
    ? t('path.askMessageWithRecommended', { score: props.analysis.similarityScore, recommended })
    : t('path.askMessage', { score: props.analysis.similarityScore })
  emit('askAi', msg)
}

function onHighlight() {
  emit('highlightNodes', props.analysis.nextRecommended)
}

function reasonText(reason: string) {
  return t(`path.reasons.${reason}`)
}
</script>

<template>
  <div class="path-card">
    <div class="path-card__header">
      <span class="path-card__title">{{ t('path.title') }}</span>
      <button class="path-card__ask" @click="onAskAi">{{ t('path.askAi') }}</button>
    </div>

    <div class="path-card__score-row">
      <div class="path-card__circle" :style="{ '--clr': scoreColor(analysis.similarityScore) }">
        <svg viewBox="0 0 36 36" class="path-card__svg">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" stroke-width="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            :stroke="scoreColor(analysis.similarityScore)"
            stroke-width="3"
            stroke-linecap="round"
            :stroke-dasharray="`${analysis.similarityScore} 100`"
            stroke-dashoffset="25"
            style="transition: stroke-dasharray 0.6s ease;"
          />
        </svg>
        <span class="path-card__score-num" :style="{ color: scoreColor(analysis.similarityScore) }">
          {{ analysis.similarityScore }}
        </span>
      </div>
      <div class="path-card__meta">
        <p class="path-card__meta-main">{{ t('path.similarity') }}</p>
        <p class="path-card__meta-sub">{{ t('path.completed', { completed: analysis.completedCount, total: analysis.totalCount }) }}</p>
      </div>
    </div>

    <div v-if="analysis.nextRecommended.length" class="path-card__section">
      <p class="path-card__label">{{ t('path.next') }}</p>
      <div class="path-card__tags">
        <span
          v-for="id in analysis.nextRecommended"
          :key="id"
          class="path-card__tag path-card__tag--next"
          @click="onHighlight"
        >
          {{ nodeIdToTitle[id] ?? id }}
        </span>
      </div>
      <div v-if="analysis.recommendationDetails?.length" class="path-card__reason-list">
        <div
          v-for="detail in analysis.recommendationDetails"
          :key="detail.nodeId"
          class="path-card__reason-item"
        >
          <span class="path-card__reason-title">{{ nodeIdToTitle[detail.nodeId] ?? detail.nodeTitle }}</span>
          <span
            v-for="reason in detail.reasons"
            :key="`${detail.nodeId}-${reason}`"
            class="path-card__reason"
          >
            {{ reasonText(reason) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="analysis.deviations.length" class="path-card__section">
      <p class="path-card__label">{{ t('path.deviations') }}</p>
      <ul class="path-card__deviations">
        <li v-for="deviation in analysis.deviations" :key="deviation.nodeId" class="path-card__deviation">
          <span class="path-card__deviation-node">{{ deviation.nodeTitle }}</span>
          <span v-if="deviation.shouldBeAfterTitles.length" class="path-card__deviation-hint">
            {{ t('path.shouldFinish', { titles: joinTitles(deviation.shouldBeAfterTitles) }) }}
          </span>
        </li>
      </ul>
    </div>

    <div v-if="analysis.totalCount > 0 && analysis.completedCount === analysis.totalCount" class="path-card__complete">
      {{ t('path.allDone') }}
    </div>
  </div>
</template>

<style scoped>
.path-card { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
.path-card__header { display: flex; align-items: center; justify-content: space-between; }
.path-card__title { font-weight: 600; color: var(--text-primary); font-size: 13px; }
.path-card__ask { font-size: 12px; padding: 3px 10px; border-radius: 6px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff; border: none; cursor: pointer; font-weight: 500; transition: opacity 0.2s; }
.path-card__ask:hover { opacity: 0.85; }
.path-card__score-row { display: flex; align-items: center; gap: 14px; }
.path-card__circle { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
.path-card__svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.path-card__score-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; }
.path-card__meta-main { font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.path-card__meta-sub { color: var(--text-muted); font-size: 12px; }
.path-card__label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.path-card__tags { display: flex; flex-wrap: wrap; gap: 6px; }
.path-card__tag { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; }
.path-card__tag--next { background: rgba(124, 58, 237, 0.12); color: #7c3aed; border: 1px solid rgba(124, 58, 237, 0.25); }
.path-card__reason-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.path-card__reason-item { display: flex; flex-direction: column; gap: 3px; padding: 7px 8px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); }
.path-card__reason-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.path-card__reason { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
.path-card__deviations { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.path-card__deviation { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 6px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); }
.path-card__deviation-node { font-weight: 500; color: #f59e0b; font-size: 12px; }
.path-card__deviation-hint { color: var(--text-muted); font-size: 11px; }
.path-card__complete { text-align: center; color: #22c55e; font-weight: 600; font-size: 13px; padding: 4px 0; }
</style>
