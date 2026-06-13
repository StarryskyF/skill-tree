<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '../../components/ThemeToggle.vue'
import LanguageToggle from '../../components/LanguageToggle.vue'
import { getEvaluationSkillTrees, getEvaluationSummary } from '../../api/evaluation'
import type { EvaluationBucket, EvaluationSkillTree, EvaluationSummary } from '../../api/evaluation'
import { useI18n } from '../../i18n'

const router = useRouter()
const { t } = useI18n()
const loading = ref(true)
const error = ref('')
const summary = ref<EvaluationSummary | null>(null)
const rows = ref<EvaluationSkillTree[]>([])
const activeHelp = ref<string | null>(null)
const activeTab = ref<'overview' | 'structure' | 'process' | 'rag' | 'gamification' | 'details'>('overview')

onMounted(loadEvaluation)

async function loadEvaluation() {
  loading.value = true
  error.value = ''
  try {
    const [summaryRes, rowsRes] = await Promise.all([
      getEvaluationSummary(),
      getEvaluationSkillTrees(),
    ])
    if (!summaryRes.data || !rowsRes.data) throw new Error(t('evaluation.unavailable'))
    summary.value = summaryRes.data
    rows.value = rowsRes.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('evaluation.loadFailed')
  } finally {
    loading.value = false
  }
}

const kpis = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    { label: t('evaluation.kpiDag'), value: formatPercent(data.dagValidityRate), sub: t('evaluation.kpiDagSub'), tone: 'green', help: t('evaluation.helpDag') },
    { label: t('evaluation.kpiGeneration'), value: formatPercent(data.generationSuccessRate), sub: t('evaluation.kpiGenerationSub', { ready: data.statusCounts.ready, total: data.totalSkillTrees }), tone: 'blue', help: t('evaluation.helpGeneration') },
    { label: t('evaluation.kpiLcs'), value: formatNumber(data.averageLcsSimilarityScore), sub: t('evaluation.kpiLcsSub'), tone: 'violet', help: t('evaluation.helpLcs') },
    { label: t('evaluation.kpiCompletion'), value: formatPercent(data.averageCompletionRate), sub: t('evaluation.kpiCompletionSub', { completed: data.totalCompletedNodes, total: data.totalPossibleNodes }), tone: 'amber', help: t('evaluation.helpCompletion') },
    { label: t('evaluation.kpiGenTime'), value: formatDuration(data.averageGenerationTimeMs), sub: t('evaluation.kpiGenTimeSub', { duration: formatDuration(data.p95GenerationTimeMs) }), tone: 'cyan', help: t('evaluation.helpGenTime') },
    { label: t('evaluation.kpiExp'), value: formatNumber(data.totalEarnedExp), sub: t('evaluation.kpiExpSub', { total: formatNumber(data.totalAvailableExp) }), tone: 'rose', help: t('evaluation.helpExp') },
  ]
})

const structureMetrics = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    { label: t('evaluation.avgNodes'), value: formatNumber(data.averageNodeCount), help: t('evaluation.helpAvgNodes') },
    { label: t('evaluation.avgEdges'), value: formatNumber(data.averageEdgeCount), help: t('evaluation.helpAvgEdges') },
    { label: t('evaluation.avgMaxDepth'), value: formatNumber(data.averageMaxDepth), help: t('evaluation.helpAvgMaxDepth') },
    { label: t('evaluation.rootRatio'), value: formatPercent(data.averageRootNodeRatio), help: t('evaluation.helpRootRatio') },
    { label: t('evaluation.prerequisiteCoverage'), value: formatPercent(data.averagePrerequisiteCoverage), help: t('evaluation.helpPrerequisiteCoverage') },
    { label: t('evaluation.edgeConsistency'), value: formatPercent(data.averageEdgeConsistency), help: t('evaluation.helpEdgeConsistency') },
    { label: t('evaluation.branchingFactor'), value: formatNumber(data.averageBranchingFactor), help: t('evaluation.helpBranchingFactor') },
  ]
})

const processKpis = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    {
      label: t('evaluation.quizPassRate'),
      value: formatPercent(data.quizPassRate),
      sub: t('evaluation.quizPassRateSub', { passed: data.eventCounts.quiz_passed, attempts: data.quizAttempts }),
      help: t('evaluation.helpQuizPassRate'),
    },
    {
      label: t('evaluation.avgQuizScore'),
      value: `${formatNumber(data.averageQuizScore)}/3`,
      sub: t('evaluation.avgQuizScoreSub'),
      help: t('evaluation.helpAvgQuizScore'),
    },
    {
      label: t('evaluation.nodeEvents'),
      value: formatNumber(data.nodeCompletionEvents),
      sub: t('evaluation.nodeEventsSub'),
      help: t('evaluation.helpNodeEvents'),
    },
  ]
})

const ragKpis = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    {
      label: t('evaluation.ragHitRate'),
      value: formatPercent(data.ragHitRate),
      sub: t('evaluation.ragHitRateSub', { hits: data.ragRetrievalCount }),
      help: t('evaluation.helpRagHitRate'),
    },
    {
      label: t('evaluation.ragEvents'),
      value: formatNumber(data.eventCounts.rag_retrieved),
      sub: t('evaluation.ragEventsSub'),
      help: t('evaluation.helpRagEvents'),
    },
  ]
})

const gamificationKpis = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    {
      label: t('evaluation.badgeEvents'),
      value: formatNumber(data.badgeUnlockEvents),
      sub: t('evaluation.badgeEventsSub'),
      help: t('evaluation.helpBadgeEvents'),
    },
    {
      label: t('evaluation.pathBonusExp'),
      value: formatNumber(data.totalPathBonusExp),
      sub: t('evaluation.pathBonusExpSub', { average: formatNumber(data.averagePathBonusExp) }),
      help: t('evaluation.helpPathBonusExp'),
    },
    {
      label: t('evaluation.userBadges'),
      value: formatNumber(data.userBadgeCount),
      sub: t('evaluation.userBadgesSub'),
      help: t('evaluation.helpUserBadges'),
    },
    {
      label: t('evaluation.userStreak'),
      value: formatNumber(data.userStreakDays),
      sub: t('evaluation.userStreakSub'),
      help: t('evaluation.helpUserStreak'),
    },
  ]
})

const tabs = computed(() => [
  { key: 'overview' as const, label: t('evaluation.tabOverview') },
  { key: 'structure' as const, label: t('evaluation.tabStructure') },
  { key: 'process' as const, label: t('evaluation.tabProcess') },
  { key: 'rag' as const, label: t('evaluation.tabRag') },
  { key: 'gamification' as const, label: t('evaluation.tabGamification') },
  { key: 'details' as const, label: t('evaluation.tabDetails') },
])

function maxBucketCount(buckets: EvaluationBucket[]) {
  return Math.max(1, ...buckets.map((bucket) => bucket.count))
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function statusClass(status: EvaluationSkillTree['status']) {
  return `status status--${status}`
}

function statusLabel(status: EvaluationSkillTree['status']) {
  if (status === 'ready') return t('evaluation.statusReady')
  if (status === 'failed') return t('evaluation.statusFailed')
  return t('evaluation.statusGenerating')
}

function helpLabel(text: string) {
  return text
}

function toggleHelp(id: string) {
  activeHelp.value = activeHelp.value === id ? null : id
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ summary: summary.value, skillTrees: rows.value }, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, 'skill-tree-evaluation.json')
}

function exportCsv() {
  const headers = [
    'title',
    'status',
    'nodeCount',
    'edgeCount',
    'maxDepth',
    'dagValid',
    'completionRate',
    'lcsSimilarityScore',
    'generationDurationMs',
    'earnedExp',
    'totalExp',
  ]
  const lines = rows.value.map((row) =>
    headers.map((header) => JSON.stringify(row[header as keyof EvaluationSkillTree] ?? '')).join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, 'skill-tree-evaluation.csv')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="evaluation-page" @click="activeHelp = null">
    <nav class="evaluation-nav">
      <div class="evaluation-nav__left">
        <div class="evaluation-nav__logo" @click="router.push('/')">ST</div>
        <div>
          <p class="evaluation-nav__eyebrow">{{ t('evaluation.navEyebrow') }}</p>
          <h1 class="evaluation-nav__title">{{ t('evaluation.navTitle') }}</h1>
        </div>
      </div>
      <div class="evaluation-nav__right">
        <LanguageToggle />
        <ThemeToggle />
        <button class="evaluation-nav__btn" @click="router.push('/')">{{ t('common.backHome') }}</button>
        <button class="evaluation-nav__btn" @click="router.push('/skill-trees')">{{ t('evaluation.skillTrees') }}</button>
      </div>
    </nav>

    <main class="evaluation-main">
      <div class="evaluation-toolbar">
        <div>
          <h2>{{ t('evaluation.title') }}</h2>
          <p>{{ t('evaluation.subtitle') }}</p>
        </div>
        <div class="evaluation-toolbar__actions">
          <button @click="loadEvaluation">{{ t('evaluation.refresh') }}</button>
          <button @click="exportCsv" :disabled="!rows.length">{{ t('evaluation.exportCsv') }}</button>
          <button @click="exportJson" :disabled="!summary">{{ t('evaluation.exportJson') }}</button>
        </div>
      </div>

      <section v-if="loading" class="evaluation-state">
        <div class="evaluation-spinner"></div>
        <p>{{ t('evaluation.loading') }}</p>
      </section>

      <section v-else-if="error" class="evaluation-state">
        <p class="evaluation-state__error">{{ error }}</p>
        <button @click="loadEvaluation">{{ t('evaluation.tryAgain') }}</button>
      </section>

      <template v-else-if="summary">
        <div class="evaluation-tabs" @click.stop>
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key; activeHelp = null"
          >
            {{ tab.label }}
          </button>
        </div>

        <section v-if="activeTab === 'overview'" class="kpi-grid">
          <article v-for="kpi in kpis" :key="kpi.label" class="kpi-card" :class="`kpi-card--${kpi.tone}`">
            <p class="with-help">
              <span>{{ kpi.label }}</span>
              <span class="help-wrap" @click.stop>
                <button class="help-dot" type="button" :aria-label="helpLabel(kpi.help)" @click="toggleHelp(`kpi-${kpi.label}`)">?</button>
                <span v-if="activeHelp === `kpi-${kpi.label}`" class="help-popover">{{ kpi.help }}</span>
              </span>
            </p>
            <strong>{{ kpi.value }}</strong>
            <span>{{ kpi.sub }}</span>
          </article>
        </section>

        <section v-if="activeTab === 'overview' || activeTab === 'structure'" class="evaluation-grid">
          <article v-if="activeTab === 'overview'" class="panel panel--status">
            <div class="panel__header">
              <h3 class="with-help">
                <span>{{ t('evaluation.statusTitle') }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot" type="button" :aria-label="t('evaluation.helpStatusPanel')" @click="toggleHelp('panel-status')">?</button>
                  <span v-if="activeHelp === 'panel-status'" class="help-popover">{{ t('evaluation.helpStatusPanel') }}</span>
                </span>
              </h3>
              <span>{{ t('evaluation.statusSub', { count: summary.totalSkillTrees }) }}</span>
            </div>
            <div class="status-bars">
              <div class="status-bars__row">
                <span>{{ t('evaluation.statusReady') }}</span>
                <div><i :style="{ width: `${summary.generationSuccessRate}%` }"></i></div>
                <b>{{ summary.statusCounts.ready }}</b>
              </div>
              <div class="status-bars__row status-bars__row--failed">
                <span>{{ t('evaluation.statusFailed') }}</span>
                <div><i :style="{ width: `${summary.generationFailureRate}%` }"></i></div>
                <b>{{ summary.statusCounts.failed }}</b>
              </div>
              <div class="status-bars__row status-bars__row--generating">
                <span>{{ t('evaluation.statusGenerating') }}</span>
                <div><i :style="{ width: `${summary.totalSkillTrees ? (summary.statusCounts.generating / summary.totalSkillTrees) * 100 : 0}%` }"></i></div>
                <b>{{ summary.statusCounts.generating }}</b>
              </div>
            </div>
          </article>

          <article v-if="activeTab === 'structure'" class="panel">
            <div class="panel__header">
              <h3 class="with-help">
                <span>{{ t('evaluation.structureTitle') }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot" type="button" :aria-label="t('evaluation.helpStructurePanel')" @click="toggleHelp('panel-structure')">?</button>
                  <span v-if="activeHelp === 'panel-structure'" class="help-popover">{{ t('evaluation.helpStructurePanel') }}</span>
                </span>
              </h3>
              <span>{{ t('evaluation.structureSub') }}</span>
            </div>
            <div class="metric-list">
              <div v-for="metric in structureMetrics" :key="metric.label">
                <span class="with-help">
                  <span>{{ metric.label }}</span>
                  <span class="help-wrap" @click.stop>
                    <button class="help-dot help-dot--tiny" type="button" :aria-label="metric.help" @click="toggleHelp(`metric-${metric.label}`)">?</button>
                    <span v-if="activeHelp === `metric-${metric.label}`" class="help-popover">{{ metric.help }}</span>
                  </span>
                </span>
                <b>{{ metric.value }}</b>
              </div>
            </div>
          </article>

          <article v-if="activeTab === 'structure'" class="panel">
            <div class="panel__header">
              <h3 class="with-help">
                <span>{{ t('evaluation.lcsDistribution') }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot" type="button" :aria-label="t('evaluation.helpLcsPanel')" @click="toggleHelp('panel-lcs')">?</button>
                  <span v-if="activeHelp === 'panel-lcs'" class="help-popover">{{ t('evaluation.helpLcsPanel') }}</span>
                </span>
              </h3>
              <span>{{ t('evaluation.lcsDistributionSub') }}</span>
            </div>
            <div class="bucket-chart">
              <div v-for="bucket in summary.distributions.lcsScores" :key="bucket.label" class="bucket-chart__bar">
                <div>
                  <i :style="{ height: `${(bucket.count / maxBucketCount(summary.distributions.lcsScores)) * 100}%` }"></i>
                </div>
                <span>{{ bucket.label }}</span>
                <b>{{ bucket.count }}</b>
              </div>
            </div>
          </article>

          <article v-if="activeTab === 'structure'" class="panel">
            <div class="panel__header">
              <h3 class="with-help">
                <span>{{ t('evaluation.completionDistribution') }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot" type="button" :aria-label="t('evaluation.helpCompletionPanel')" @click="toggleHelp('panel-completion')">?</button>
                  <span v-if="activeHelp === 'panel-completion'" class="help-popover">{{ t('evaluation.helpCompletionPanel') }}</span>
                </span>
              </h3>
              <span>{{ t('evaluation.completionDistributionSub') }}</span>
            </div>
            <div class="bucket-chart bucket-chart--green">
              <div v-for="bucket in summary.distributions.completionRates" :key="bucket.label" class="bucket-chart__bar">
                <div>
                  <i :style="{ height: `${(bucket.count / maxBucketCount(summary.distributions.completionRates)) * 100}%` }"></i>
                </div>
                <span>{{ bucket.label }}</span>
                <b>{{ bucket.count }}</b>
              </div>
            </div>
          </article>
        </section>

        <section v-if="activeTab === 'process'" class="notice-panel">
          {{ t('evaluation.phase2Notice') }}
        </section>

        <section v-if="activeTab === 'process'" class="panel phase2-panel">
          <div class="panel__header">
            <h3 class="with-help">
              <span>{{ t('evaluation.phase2Title') }}</span>
              <span class="help-wrap" @click.stop>
                <button class="help-dot" type="button" :aria-label="t('evaluation.helpPhase2Panel')" @click="toggleHelp('panel-phase2')">?</button>
                <span v-if="activeHelp === 'panel-phase2'" class="help-popover">{{ t('evaluation.helpPhase2Panel') }}</span>
              </span>
            </h3>
            <span>{{ t('evaluation.phase2Sub') }}</span>
          </div>
          <div class="process-grid">
            <div v-for="item in processKpis" :key="item.label" class="process-card">
              <p class="with-help">
                <span>{{ item.label }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot help-dot--tiny" type="button" :aria-label="item.help" @click="toggleHelp(`process-${item.label}`)">?</button>
                  <span v-if="activeHelp === `process-${item.label}`" class="help-popover">{{ item.help }}</span>
                </span>
              </p>
              <strong>{{ item.value }}</strong>
              <span>{{ item.sub }}</span>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'process'" class="evaluation-grid evaluation-grid--phase2">
          <article class="panel">
            <div class="panel__header">
              <h3 class="with-help">
                <span>{{ t('evaluation.quizScoreDistribution') }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot" type="button" :aria-label="t('evaluation.helpQuizScoreDistribution')" @click="toggleHelp('panel-quiz-score')">?</button>
                  <span v-if="activeHelp === 'panel-quiz-score'" class="help-popover">{{ t('evaluation.helpQuizScoreDistribution') }}</span>
                </span>
              </h3>
              <span>{{ t('evaluation.quizScoreDistributionSub') }}</span>
            </div>
            <div class="bucket-chart bucket-chart--amber">
              <div v-for="bucket in summary.distributions.quizScores" :key="bucket.label" class="bucket-chart__bar">
                <div>
                  <i :style="{ height: `${(bucket.count / maxBucketCount(summary.distributions.quizScores)) * 100}%` }"></i>
                </div>
                <span>{{ bucket.label }}</span>
                <b>{{ bucket.count }}</b>
              </div>
            </div>
          </article>

          <article class="panel">
            <div class="panel__header">
              <h3>{{ t('evaluation.processCounts') }}</h3>
              <span>{{ t('evaluation.phase2Sub') }}</span>
            </div>
            <div class="metric-list">
              <div>
                <span>{{ t('evaluation.treeEvents') }}</span>
                <b>{{ summary.eventCounts.tree_created + summary.eventCounts.tree_ready + summary.eventCounts.tree_failed }}</b>
              </div>
              <div>
                <span>{{ t('evaluation.quizEvents') }}</span>
                <b>{{ summary.eventCounts.quiz_passed + summary.eventCounts.quiz_failed }}</b>
              </div>
              <div>
                <span>{{ t('evaluation.rewardEvents') }}</span>
                <b>{{ summary.eventCounts.exp_gained + summary.eventCounts.badge_unlocked }}</b>
              </div>
              <div>
                <span>{{ t('evaluation.ragEvents') }}</span>
                <b>{{ summary.eventCounts.rag_retrieved }}</b>
              </div>
            </div>
          </article>
        </section>

        <section v-if="activeTab === 'rag'" class="panel phase2-panel">
          <div class="panel__header">
            <h3 class="with-help">
              <span>{{ t('evaluation.ragTitle') }}</span>
              <span class="help-wrap" @click.stop>
                <button class="help-dot" type="button" :aria-label="t('evaluation.helpRagPanel')" @click="toggleHelp('panel-rag')">?</button>
                <span v-if="activeHelp === 'panel-rag'" class="help-popover">{{ t('evaluation.helpRagPanel') }}</span>
              </span>
            </h3>
            <span>{{ t('evaluation.ragSub') }}</span>
          </div>
          <div class="process-grid process-grid--compact">
            <div v-for="item in ragKpis" :key="item.label" class="process-card">
              <p class="with-help">
                <span>{{ item.label }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot help-dot--tiny" type="button" :aria-label="item.help" @click="toggleHelp(`rag-${item.label}`)">?</button>
                  <span v-if="activeHelp === `rag-${item.label}`" class="help-popover">{{ item.help }}</span>
                </span>
              </p>
              <strong>{{ item.value }}</strong>
              <span>{{ item.sub }}</span>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'gamification'" class="panel phase2-panel">
          <div class="panel__header">
            <h3 class="with-help">
              <span>{{ t('evaluation.gamificationTitle') }}</span>
              <span class="help-wrap" @click.stop>
                <button class="help-dot" type="button" :aria-label="t('evaluation.helpGamificationPanel')" @click="toggleHelp('panel-gamification')">?</button>
                <span v-if="activeHelp === 'panel-gamification'" class="help-popover">{{ t('evaluation.helpGamificationPanel') }}</span>
              </span>
            </h3>
            <span>{{ t('evaluation.gamificationSub') }}</span>
          </div>
          <div class="process-grid process-grid--compact">
            <div v-for="item in gamificationKpis" :key="item.label" class="process-card">
              <p class="with-help">
                <span>{{ item.label }}</span>
                <span class="help-wrap" @click.stop>
                  <button class="help-dot help-dot--tiny" type="button" :aria-label="item.help" @click="toggleHelp(`game-${item.label}`)">?</button>
                  <span v-if="activeHelp === `game-${item.label}`" class="help-popover">{{ item.help }}</span>
                </span>
              </p>
              <strong>{{ item.value }}</strong>
              <span>{{ item.sub }}</span>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'details'" class="panel table-panel">
          <div class="panel__header">
            <h3 class="with-help">
              <span>{{ t('evaluation.detailTitle') }}</span>
              <span class="help-wrap" @click.stop>
                <button class="help-dot" type="button" :aria-label="t('evaluation.helpDetailPanel')" @click="toggleHelp('panel-detail')">?</button>
                <span v-if="activeHelp === 'panel-detail'" class="help-popover">{{ t('evaluation.helpDetailPanel') }}</span>
              </span>
            </h3>
            <span>{{ t('evaluation.records', { count: rows.length }) }}</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><span class="with-help">{{ t('evaluation.thSkillTree') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-tree')">?</button><span v-if="activeHelp === 'th-tree'" class="help-popover">{{ t('evaluation.helpTableSkillTree') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thStatus') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-status')">?</button><span v-if="activeHelp === 'th-status'" class="help-popover">{{ t('evaluation.helpTableStatus') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thDag') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-dag')">?</button><span v-if="activeHelp === 'th-dag'" class="help-popover">{{ t('evaluation.helpTableDag') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thNodes') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-nodes')">?</button><span v-if="activeHelp === 'th-nodes'" class="help-popover">{{ t('evaluation.helpTableNodes') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thDepth') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-depth')">?</button><span v-if="activeHelp === 'th-depth'" class="help-popover">{{ t('evaluation.helpTableDepth') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thPrereq') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-prereq')">?</button><span v-if="activeHelp === 'th-prereq'" class="help-popover">{{ t('evaluation.helpTablePrereq') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thCompletion') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-completion')">?</button><span v-if="activeHelp === 'th-completion'" class="help-popover">{{ t('evaluation.helpTableCompletion') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thLcs') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-lcs')">?</button><span v-if="activeHelp === 'th-lcs'" class="help-popover">{{ t('evaluation.helpTableLcs') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thGenTime') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-time')">?</button><span v-if="activeHelp === 'th-time'" class="help-popover">{{ t('evaluation.helpTableGenTime') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thExp') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-exp')">?</button><span v-if="activeHelp === 'th-exp'" class="help-popover">{{ t('evaluation.helpTableExp') }}</span></span></span></th>
                  <th><span class="with-help">{{ t('evaluation.thUpdated') }}<span class="help-wrap" @click.stop><button class="help-dot help-dot--tiny" type="button" @click="toggleHelp('th-updated')">?</button><span v-if="activeHelp === 'th-updated'" class="help-popover">{{ t('evaluation.helpTableUpdated') }}</span></span></span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.id">
                  <td>
                    <button class="table-link" @click="router.push(`/skill-trees/${row.id}`)">{{ row.title || t('evaluation.untitled') }}</button>
                    <small>{{ row.goal }}</small>
                  </td>
                  <td><span :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td>
                    <span :class="row.dagValid ? 'dag dag--valid' : 'dag dag--invalid'">
                      {{ row.dagValid ? t('evaluation.valid') : t('evaluation.issues', { count: row.structureIssueCount }) }}
                    </span>
                  </td>
                  <td>{{ row.nodeCount }} / {{ row.edgeCount }}</td>
                  <td>{{ row.maxDepth }}</td>
                  <td>{{ formatPercent(row.prerequisiteCoverage) }}</td>
                  <td>{{ formatPercent(row.completionRate) }}</td>
                  <td>{{ row.lcsSimilarityScore }}</td>
                  <td>{{ formatDuration(row.generationDurationMs) }}</td>
                  <td>{{ row.earnedExp }} / {{ row.totalExp }}</td>
                  <td>{{ formatDate(row.updatedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.evaluation-page { min-height: 100vh; background: var(--bg-page); color: var(--text-primary); }
.evaluation-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; background: var(--bg-card); border-bottom: 1px solid var(--border-color); }
.evaluation-nav__left, .evaluation-nav__right { display: flex; align-items: center; gap: 12px; }
.evaluation-nav__logo { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; background: linear-gradient(135deg, #7c3aed, #06b6d4); }
.evaluation-nav__eyebrow { margin: 0 0 2px; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.evaluation-nav__title { margin: 0; font-size: 16px; color: var(--text-primary); }
.evaluation-nav__btn, .evaluation-toolbar button, .evaluation-state button { padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-secondary); font-size: 13px; cursor: pointer; }
.evaluation-nav__btn:hover, .evaluation-toolbar button:hover:not(:disabled), .evaluation-state button:hover { opacity: 0.8; }
.evaluation-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
.evaluation-main { max-width: 1280px; margin: 0 auto; padding: 28px 24px 48px; }
.evaluation-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.evaluation-toolbar h2 { margin: 0 0 6px; font-size: 24px; }
.evaluation-toolbar p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 720px; }
.evaluation-toolbar__actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.evaluation-tabs { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-card); box-shadow: var(--shadow-card); }
.evaluation-tabs button { padding: 8px 14px; border: 0; border-radius: 7px; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; }
.evaluation-tabs button:hover { color: var(--text-primary); background: var(--bg-input); }
.evaluation-tabs button.active { color: #fff; background: linear-gradient(135deg, #2563eb, #0f766e); }
.evaluation-state { min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--text-muted); }
.evaluation-state__error { color: #ef4444; }
.evaluation-spinner { width: 38px; height: 38px; border-radius: 50%; border: 3px solid var(--border-color); border-top-color: #2563eb; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.kpi-card { padding: 16px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card); border-top: 3px solid #64748b; }
.kpi-card p, .kpi-card span { margin: 0; color: var(--text-muted); font-size: 12px; }
.kpi-card strong { display: block; margin: 8px 0 5px; font-size: 26px; line-height: 1; color: var(--text-primary); }
.with-help { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.help-wrap { position: relative; display: inline-flex; align-items: center; flex: 0 0 auto; }
.help-dot { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--border-color); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; padding: 0; background: var(--bg-input); color: var(--text-muted); font-size: 11px; font-weight: 800; line-height: 1; cursor: help; }
.help-dot:hover, .help-dot:focus-visible { color: #2563eb; border-color: rgba(37, 99, 235, 0.55); outline: none; }
.help-dot--tiny { width: 15px; height: 15px; font-size: 9px; }
.help-popover { position: absolute; z-index: 50; top: calc(100% + 8px); left: 50%; width: min(280px, 78vw); transform: translateX(-50%); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); box-shadow: 0 14px 36px rgba(15, 23, 42, 0.24); font-size: 12px; font-weight: 500; line-height: 1.45; text-transform: none; letter-spacing: 0; text-align: left; white-space: normal; }
.help-popover::before { content: ''; position: absolute; top: -5px; left: 50%; width: 9px; height: 9px; transform: translateX(-50%) rotate(45deg); background: var(--bg-card); border-left: 1px solid var(--border-color); border-top: 1px solid var(--border-color); }
.kpi-card--green { border-top-color: #22c55e; }
.kpi-card--blue { border-top-color: #2563eb; }
.kpi-card--violet { border-top-color: #7c3aed; }
.kpi-card--amber { border-top-color: #f59e0b; }
.kpi-card--cyan { border-top-color: #06b6d4; }
.kpi-card--rose { border-top-color: #e11d48; }
.evaluation-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
.panel { border-radius: 8px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card); }
.panel__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel__header h3 { margin: 0; font-size: 15px; }
.panel__header span { color: var(--text-muted); font-size: 12px; }
.status-bars { display: flex; flex-direction: column; gap: 12px; }
.status-bars__row { display: grid; grid-template-columns: 78px 1fr 28px; gap: 8px; align-items: center; font-size: 12px; color: var(--text-secondary); }
.status-bars__row div { height: 8px; border-radius: 99px; overflow: hidden; background: var(--bg-input); }
.status-bars__row i { display: block; height: 100%; border-radius: inherit; background: #22c55e; }
.status-bars__row--failed i { background: #ef4444; }
.status-bars__row--generating i { background: #f59e0b; }
.metric-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.metric-list div { padding: 9px 10px; border-radius: 8px; background: var(--bg-input); }
.metric-list span { display: block; color: var(--text-muted); font-size: 11px; margin-bottom: 4px; }
.metric-list b { font-size: 15px; color: var(--text-primary); }
.bucket-chart { height: 190px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; align-items: end; }
.bucket-chart__bar { height: 100%; display: grid; grid-template-rows: 1fr auto auto; gap: 5px; text-align: center; color: var(--text-muted); font-size: 11px; }
.bucket-chart__bar div { height: 130px; display: flex; align-items: end; justify-content: center; border-radius: 8px; background: var(--bg-input); overflow: hidden; }
.bucket-chart__bar i { width: 100%; min-height: 3px; display: block; border-radius: 8px 8px 0 0; background: linear-gradient(180deg, #7c3aed, #2563eb); }
.bucket-chart--green .bucket-chart__bar i { background: linear-gradient(180deg, #22c55e, #0f766e); }
.bucket-chart--amber .bucket-chart__bar i { background: linear-gradient(180deg, #f59e0b, #e11d48); }
.notice-panel { margin-bottom: 14px; padding: 11px 14px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.1); color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
.phase2-panel { margin-bottom: 14px; }
.process-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.process-grid--compact { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.process-card { padding: 12px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); }
.process-card p, .process-card span { margin: 0; color: var(--text-muted); font-size: 11px; }
.process-card strong { display: block; margin: 7px 0 4px; font-size: 22px; color: var(--text-primary); }
.evaluation-grid--phase2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.table-panel { padding: 0; overflow: hidden; }
.table-panel .panel__header { padding: 16px 16px 0; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; min-width: 1080px; }
th, td { padding: 12px 14px; border-top: 1px solid var(--border-color); text-align: left; font-size: 12px; vertical-align: top; }
th { color: var(--text-muted); font-weight: 600; background: var(--bg-input); }
td small { display: block; color: var(--text-muted); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px; }
.table-link { padding: 0; border: none; background: transparent; color: var(--text-primary); font-weight: 700; cursor: pointer; text-align: left; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table-link:hover { color: #2563eb; }
.status, .dag { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status--ready, .dag--valid { color: #15803d; background: rgba(34, 197, 94, 0.12); }
.status--failed, .dag--invalid { color: #dc2626; background: rgba(239, 68, 68, 0.12); }
.status--generating { color: #b45309; background: rgba(245, 158, 11, 0.14); }
@media (max-width: 1100px) {
  .kpi-grid, .evaluation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .process-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .process-grid--compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .evaluation-nav, .evaluation-toolbar { flex-direction: column; align-items: stretch; }
  .evaluation-nav__right, .evaluation-toolbar__actions { justify-content: flex-start; }
  .evaluation-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpi-grid, .evaluation-grid { grid-template-columns: 1fr; }
  .process-grid { grid-template-columns: 1fr; }
  .process-grid--compact { grid-template-columns: 1fr; }
  .evaluation-main { padding: 20px 14px 36px; }
}
</style>
