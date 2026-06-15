<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Hide, View } from '@element-plus/icons-vue'
import { generateQuiz, completeNode } from '../../../../api/skill-trees'
import type { CompleteNodeResult, QuizQuestion, QuizReviewItem, QuizSession } from '../../../../api/skill-trees'
import { useI18n } from '../../../../i18n'

const props = defineProps<{
  treeId: string
  nodeId: string
  nodeTitle: string
  initialQuiz?: QuizSession
}>()

const emit = defineEmits<{
  complete: [result: CompleteNodeResult]
  close: []
  quizGenerated: [quiz: QuizSession]
}>()

const { locale, t } = useI18n()
type Phase = 'loading' | 'quiz' | 'result'
const phase = ref<Phase>('loading')
const errorMsg = ref('')
const quizSessionId = ref('')
const questions = ref<QuizQuestion[]>([])
const selectedAnswers = ref<number[]>([-1, -1, -1])
const passed = ref(false)
const score = ref(0)
const submitting = ref(false)
const completeResult = ref<CompleteNodeResult | null>(null)
const review = ref<QuizReviewItem[]>([])
const visibleCorrectAnswers = ref<Set<number>>(new Set())
const visibleExplanations = ref<Set<number>>(new Set())

const allAnswered = computed(() => selectedAnswers.value.every((answer) => answer !== -1))

onMounted(async () => {
  if (props.initialQuiz) {
    applyQuizSession(props.initialQuiz)
    return
  }
  await loadQuiz(false)
})

function applyQuizSession(quiz: QuizSession) {
  resetReviewVisibility()
  quizSessionId.value = quiz.quizSessionId
  questions.value = quiz.questions
  if (quiz.status === 'failed' && quiz.review) {
    selectedAnswers.value = quiz.lastAnswers ?? [-1, -1, -1]
    score.value = quiz.lastScore ?? 0
    review.value = quiz.review
    phase.value = 'result'
  } else {
    selectedAnswers.value = [-1, -1, -1]
    review.value = []
    phase.value = 'quiz'
  }
}

async function loadQuiz(forceRegenerate: boolean) {
  phase.value = 'loading'
  errorMsg.value = ''
  resetReviewVisibility()
  try {
    const res = await generateQuiz(props.treeId, props.nodeId, locale.value, forceRegenerate)
    if (!res.data) throw new Error(res.message || t('quiz.generateFailed'))
    applyQuizSession(res.data)
    emit('quizGenerated', res.data)
  } catch (err) {
    errorMsg.value = (err as Error).message || t('quiz.generateFailed')
    phase.value = 'result'
  }
}

async function submitAnswers() {
  if (!allAnswered.value || submitting.value) return
  submitting.value = true
  try {
    const res = await completeNode(props.treeId, props.nodeId, {
      quizSessionId: quizSessionId.value,
      quizAnswers: selectedAnswers.value,
    })
    if (!res.data) throw new Error(res.message || t('quiz.submitFailed'))
    passed.value = res.data.passed
    score.value = res.data.score
    completeResult.value = res.data
    review.value = res.data.review ?? []
    resetReviewVisibility()
    if (res.data.passed) emit('complete', res.data)
    phase.value = 'result'
  } catch (err) {
    errorMsg.value = (err as Error).message || t('quiz.submitFailed')
    phase.value = 'result'
  } finally {
    submitting.value = false
  }
}

function retrySameQuiz() {
  selectedAnswers.value = [-1, -1, -1]
  passed.value = false
  score.value = 0
  errorMsg.value = ''
  completeResult.value = null
  review.value = []
  resetReviewVisibility()
  phase.value = 'quiz'
}

async function regenerateQuiz() {
  selectedAnswers.value = [-1, -1, -1]
  passed.value = false
  score.value = 0
  completeResult.value = null
  review.value = []
  resetReviewVisibility()
  await loadQuiz(true)
}

function isCorrectAnswerVisible(index: number) {
  return visibleCorrectAnswers.value.has(index)
}

function toggleCorrectAnswer(index: number) {
  const next = new Set(visibleCorrectAnswers.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  visibleCorrectAnswers.value = next
}

function isExplanationVisible(index: number) {
  return visibleExplanations.value.has(index)
}

function toggleExplanation(index: number) {
  const next = new Set(visibleExplanations.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  visibleExplanations.value = next
}

function resetReviewVisibility() {
  visibleCorrectAnswers.value = new Set()
  visibleExplanations.value = new Set()
}
</script>

<template>
  <div class="quiz-overlay" @click.self="phase === 'result' ? emit('close') : undefined">
    <div class="quiz-modal">
      <div class="quiz-modal__header">
        <h2 class="quiz-modal__title">
          <template v-if="phase === 'loading'">{{ t('quiz.loading') }}</template>
          <template v-else-if="phase === 'quiz'">{{ t('quiz.title', { title: props.nodeTitle }) }}</template>
          <template v-else-if="passed">{{ t('quiz.passed') }}</template>
          <template v-else-if="errorMsg">{{ t('quiz.error') }}</template>
          <template v-else>{{ t('quiz.failed') }}</template>
        </h2>
        <button v-if="phase === 'result'" class="quiz-modal__close" @click="emit('close')">x</button>
      </div>

      <div v-if="phase === 'loading'" class="quiz-phase quiz-phase--center">
        <div class="quiz-spinner"></div>
        <p class="quiz-hint">{{ t('quiz.loadingHint', { title: props.nodeTitle }) }}</p>
      </div>

      <template v-if="phase === 'quiz'">
        <div class="quiz-questions">
          <div v-for="(question, qi) in questions" :key="qi" class="quiz-question">
            <p class="quiz-question__text">{{ qi + 1 }}. {{ question.question }}</p>
            <div class="quiz-options">
              <button
                v-for="(option, oi) in question.options"
                :key="oi"
                class="quiz-option"
                :class="{ 'quiz-option--selected': selectedAnswers[qi] === oi }"
                @click="selectedAnswers[qi] = oi"
              >
                <span class="quiz-option__label">{{ ['A', 'B', 'C', 'D'][oi] }}</span>
                {{ option }}
              </button>
            </div>
          </div>
        </div>

        <div class="quiz-actions">
          <button class="quiz-btn quiz-btn--secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
          <button class="quiz-btn quiz-btn--primary" :disabled="!allAnswered || submitting" @click="submitAnswers">
            {{ submitting ? t('quiz.submitting') : t('quiz.submit') }}
          </button>
        </div>
      </template>

      <div v-if="phase === 'result'" class="quiz-phase quiz-phase--center">
        <template v-if="errorMsg">
          <div class="quiz-result-icon quiz-result-icon--fail">!</div>
          <p class="quiz-result-msg" style="color: var(--color-error, #ef4444);">{{ errorMsg }}</p>
          <button class="quiz-btn quiz-btn--secondary quiz-btn--full" @click="emit('close')">{{ t('common.close') }}</button>
        </template>

        <template v-else-if="passed">
          <div class="quiz-result-icon quiz-result-icon--pass">OK</div>
          <p class="quiz-result-title">{{ t('quiz.passedTitle') }}</p>
          <p class="quiz-result-sub">{{ t('quiz.passedSub', { score }) }}</p>

          <div v-if="review.length" class="quiz-review">
            <div v-for="(item, index) in review" :key="index" class="quiz-review-item" :class="{ correct: item.isCorrect }">
              <p class="quiz-review-item__question">{{ index + 1 }}. {{ item.question }}</p>
              <p>{{ t('quiz.yourAnswer') }}: {{ item.userAnswer }}</p>
              <div class="quiz-answer-line">
                <span>{{ t('quiz.correctAnswer') }}:</span>
                <span v-if="isCorrectAnswerVisible(index)" class="quiz-answer-line__value">{{ item.correctAnswer }}</span>
                <span v-else class="quiz-answer-line__hidden">{{ t('quiz.answerHidden') }}</span>
                <button
                  class="quiz-answer-toggle"
                  type="button"
                  :title="isCorrectAnswerVisible(index) ? t('quiz.hideCorrectAnswer') : t('quiz.showCorrectAnswer')"
                  :aria-label="isCorrectAnswerVisible(index) ? t('quiz.hideCorrectAnswer') : t('quiz.showCorrectAnswer')"
                  @click="toggleCorrectAnswer(index)"
                >
                  <Hide v-if="isCorrectAnswerVisible(index)" />
                  <View v-else />
                </button>
              </div>
              <div class="quiz-answer-line">
                <span>{{ t('quiz.explanation') }}:</span>
                <span v-if="isExplanationVisible(index)" class="quiz-answer-line__value quiz-answer-line__value--long">{{ item.explanation }}</span>
                <span v-else class="quiz-answer-line__hidden">{{ t('quiz.explanationHidden') }}</span>
                <button
                  class="quiz-answer-toggle"
                  type="button"
                  :title="isExplanationVisible(index) ? t('quiz.hideExplanation') : t('quiz.showExplanation')"
                  :aria-label="isExplanationVisible(index) ? t('quiz.hideExplanation') : t('quiz.showExplanation')"
                  @click="toggleExplanation(index)"
                >
                  <Hide v-if="isExplanationVisible(index)" />
                  <View v-else />
                </button>
              </div>
            </div>
          </div>

          <div v-if="completeResult?.expGained" class="quiz-exp-gain">
            <span class="quiz-exp-float">+{{ completeResult.expGained }} EXP</span>
          </div>
          <p v-if="completeResult?.pathBonusExp" class="quiz-bonus">
            {{ t('quiz.pathBonus', { bonus: completeResult.pathBonusExp }) }}
          </p>

          <div v-if="completeResult?.newExp !== undefined" class="quiz-exp-bar-wrap">
            <div class="quiz-exp-bar-header">
              <span>Lv.{{ completeResult.newLevel }}</span>
              <span>{{ completeResult.newExp }} EXP</span>
            </div>
            <div class="quiz-exp-bar-track">
              <div
                class="quiz-exp-bar-fill"
                :style="`width: ${Math.min((completeResult.newExp / (completeResult.newLevel! >= 5 ? 500 : [50,150,300,500][completeResult.newLevel!-1])) * 100, 100)}%`"
              ></div>
            </div>
          </div>

          <div v-if="completeResult?.newBadges?.length" class="quiz-badges">
            <p class="quiz-badges__label">{{ t('quiz.unlockedBadges') }}</p>
            <div v-for="badge in completeResult.newBadges" :key="badge.id" class="quiz-badge-item">
              {{ badge.name }}
            </div>
          </div>

          <button class="quiz-btn quiz-btn--primary quiz-btn--full" @click="emit('close')">{{ t('quiz.continue') }}</button>
        </template>

        <template v-else>
          <div class="quiz-result-icon quiz-result-icon--fail">!</div>
          <p class="quiz-result-title">{{ t('quiz.failed') }}</p>
          <p class="quiz-result-sub">{{ t('quiz.failedSub', { score }) }}</p>

          <div v-if="review.length" class="quiz-review">
            <div v-for="(item, index) in review" :key="index" class="quiz-review-item" :class="{ correct: item.isCorrect }">
              <p class="quiz-review-item__question">{{ index + 1 }}. {{ item.question }}</p>
              <p>{{ t('quiz.yourAnswer') }}: {{ item.userAnswer }}</p>
              <div class="quiz-answer-line">
                <span>{{ t('quiz.correctAnswer') }}:</span>
                <span v-if="isCorrectAnswerVisible(index)" class="quiz-answer-line__value">{{ item.correctAnswer }}</span>
                <span v-else class="quiz-answer-line__hidden">{{ t('quiz.answerHidden') }}</span>
                <button
                  class="quiz-answer-toggle"
                  type="button"
                  :title="isCorrectAnswerVisible(index) ? t('quiz.hideCorrectAnswer') : t('quiz.showCorrectAnswer')"
                  :aria-label="isCorrectAnswerVisible(index) ? t('quiz.hideCorrectAnswer') : t('quiz.showCorrectAnswer')"
                  @click="toggleCorrectAnswer(index)"
                >
                  <Hide v-if="isCorrectAnswerVisible(index)" />
                  <View v-else />
                </button>
              </div>
              <div class="quiz-answer-line">
                <span>{{ t('quiz.explanation') }}:</span>
                <span v-if="isExplanationVisible(index)" class="quiz-answer-line__value quiz-answer-line__value--long">{{ item.explanation }}</span>
                <span v-else class="quiz-answer-line__hidden">{{ t('quiz.explanationHidden') }}</span>
                <button
                  class="quiz-answer-toggle"
                  type="button"
                  :title="isExplanationVisible(index) ? t('quiz.hideExplanation') : t('quiz.showExplanation')"
                  :aria-label="isExplanationVisible(index) ? t('quiz.hideExplanation') : t('quiz.showExplanation')"
                  @click="toggleExplanation(index)"
                >
                  <Hide v-if="isExplanationVisible(index)" />
                  <View v-else />
                </button>
              </div>
            </div>
          </div>

          <div class="quiz-actions">
            <button class="quiz-btn quiz-btn--secondary" @click="emit('close')">{{ t('common.close') }}</button>
            <button class="quiz-btn quiz-btn--secondary" @click="retrySameQuiz">{{ t('quiz.retry') }}</button>
            <button class="quiz-btn quiz-btn--primary" @click="regenerateQuiz">{{ t('quiz.regenerate') }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); }
.quiz-modal { width: 100%; max-width: 620px; max-height: 92vh; overflow: auto; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px; background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4); }
.quiz-modal__header { display: flex; align-items: center; justify-content: space-between; }
.quiz-modal__title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
.quiz-modal__close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color); background-color: var(--bg-input); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: opacity 0.15s; }
.quiz-modal__close:hover { opacity: 0.7; }
.quiz-phase { display: flex; flex-direction: column; gap: 12px; }
.quiz-phase--center { align-items: center; padding: 16px 0; }
.quiz-spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--border-color); border-top-color: #7c3aed; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.quiz-hint { font-size: 13px; color: var(--text-secondary); text-align: center; margin: 0; }
.quiz-questions { display: flex; flex-direction: column; gap: 20px; }
.quiz-question { display: flex; flex-direction: column; gap: 10px; }
.quiz-question__text { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0; line-height: 1.5; }
.quiz-options { display: flex; flex-direction: column; gap: 6px; }
.quiz-option { display: flex; align-items: center; gap: 8px; text-align: left; padding: 10px 14px; border-radius: 10px; font-size: 13px; border: 1.5px solid var(--border-color); background-color: var(--bg-input); color: var(--text-secondary); cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s; line-height: 1.4; }
.quiz-option:hover { border-color: rgba(124, 58, 237, 0.5); color: var(--text-primary); }
.quiz-option--selected { background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15)); border-color: #7c3aed; color: var(--text-primary); }
.quiz-option__label { font-weight: 700; flex-shrink: 0; color: var(--text-muted); }
.quiz-option--selected .quiz-option__label { color: #7c3aed; }
.quiz-actions { display: flex; gap: 10px; width: 100%; }
.quiz-btn { flex: 1; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; border: none; }
.quiz-btn:hover:not(:disabled) { opacity: 0.85; }
.quiz-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.quiz-btn--primary { background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; }
.quiz-btn--secondary { background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color); }
.quiz-btn--full { flex: none; width: 100%; }
.quiz-result-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; }
.quiz-result-icon--pass { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.quiz-result-icon--fail { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.quiz-result-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
.quiz-result-msg, .quiz-result-sub { font-size: 13px; text-align: center; margin: 0; color: var(--text-secondary); }
.quiz-review { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.quiz-review-item { padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.28); background: rgba(239, 68, 68, 0.08); color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.quiz-review-item.correct { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.08); }
.quiz-review-item p { margin: 3px 0; }
.quiz-review-item__question { color: var(--text-primary); font-weight: 700; }
.quiz-answer-line { display: flex; align-items: center; gap: 6px; margin: 3px 0; min-height: 28px; flex-wrap: wrap; }
.quiz-answer-line__value { color: var(--text-primary); font-weight: 600; }
.quiz-answer-line__value--long { flex: 1 1 100%; font-weight: 500; line-height: 1.5; }
.quiz-answer-line__hidden { color: var(--text-muted); }
.quiz-answer-toggle { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: color 0.15s, border-color 0.15s, opacity 0.15s; }
.quiz-answer-toggle:hover { color: var(--text-primary); border-color: rgba(124, 58, 237, 0.45); }
.quiz-answer-toggle svg { width: 15px; height: 15px; }
.quiz-exp-gain { position: relative; height: 32px; display: flex; justify-content: center; }
.quiz-exp-float { font-size: 20px; font-weight: 800; color: #fbbf24; animation: exp-float 1.2s ease-out both; display: inline-block; }
.quiz-bonus { margin: -8px 0 0; font-size: 12px; font-weight: 700; color: #f59e0b; }
@keyframes exp-float { 0% { transform: translateY(0); opacity: 1; } 60% { transform: translateY(-20px); opacity: 1; } 100% { transform: translateY(-28px); opacity: 0; } }
.quiz-exp-bar-wrap { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.quiz-exp-bar-header { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.quiz-exp-bar-track { height: 6px; border-radius: 99px; background: var(--bg-input); overflow: hidden; }
.quiz-exp-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #7c3aed, #fbbf24); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
.quiz-badges { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.quiz-badges__label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #fbbf24; text-transform: uppercase; margin: 0; }
.quiz-badge-item { font-size: 13px; font-weight: 600; color: var(--text-primary); background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(124,58,237,0.1)); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 6px 10px; }
</style>
