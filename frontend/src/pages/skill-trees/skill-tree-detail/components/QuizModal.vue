<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { generateQuiz, completeNode } from '../../../../api/skill-trees'
import type { QuizQuestion, CompleteNodeResult } from '../../../../api/skill-trees'

const props = defineProps<{
  treeId: string
  nodeId: string
  nodeTitle: string
  initialQuestions?: QuizQuestion[]
}>()

const emit = defineEmits<{
  complete: [result: CompleteNodeResult]
  close: []
  questionsGenerated: [questions: QuizQuestion[]]
}>()

type Phase = 'loading' | 'quiz' | 'result'
const phase = ref<Phase>('loading')
const errorMsg = ref('')
const questions = ref<QuizQuestion[]>([])
const selectedAnswers = ref<number[]>([-1, -1, -1])
const passed = ref(false)
const score = ref(0)
const submitting = ref(false)
const completeResult = ref<CompleteNodeResult | null>(null)

const allAnswered = computed(() => selectedAnswers.value.every((a) => a !== -1))

onMounted(async () => {
  if (props.initialQuestions) {
    questions.value = props.initialQuestions
    phase.value = 'quiz'
    return
  }
  try {
    const res = await generateQuiz(props.treeId, props.nodeId)
    if (!res.data) throw new Error(res.message || '生成失败')
    questions.value = res.data
    emit('questionsGenerated', res.data)
    phase.value = 'quiz'
  } catch (err) {
    errorMsg.value = (err as Error).message || '题目生成失败，请重试'
    phase.value = 'result'
  }
})

async function submitAnswers() {
  if (!allAnswered.value || submitting.value) return
  submitting.value = true
  try {
    const res = await completeNode(props.treeId, props.nodeId, {
      quizAnswers: selectedAnswers.value,
      questions: questions.value,
    })
    if (!res.data) throw new Error(res.message || '提交失败')
    passed.value = res.data.passed
    score.value = res.data.score
    completeResult.value = res.data
    if (res.data.passed) {
      emit('complete', res.data)
    }
    phase.value = 'result'
  } catch (err) {
    errorMsg.value = (err as Error).message || '提交失败，请重试'
    phase.value = 'result'
  } finally {
    submitting.value = false
  }
}

function retry() {
  selectedAnswers.value = [-1, -1, -1]
  passed.value = false
  score.value = 0
  errorMsg.value = ''
  phase.value = 'quiz'
}
</script>

<template>
  <div
    class="quiz-overlay"
    @click.self="phase === 'result' ? emit('close') : undefined"
  >
    <div class="quiz-modal">
      <!-- Header -->
      <div class="quiz-modal__header">
        <h2 class="quiz-modal__title">
          <template v-if="phase === 'loading'">正在生成题目...</template>
          <template v-else-if="phase === 'quiz'">测验：{{ props.nodeTitle }}</template>
          <template v-else-if="passed">🎉 通过！</template>
          <template v-else-if="errorMsg">出现错误</template>
          <template v-else>未通过</template>
        </h2>
        <button v-if="phase === 'result'" class="quiz-modal__close" @click="emit('close')">✕</button>
      </div>

      <!-- Loading phase -->
      <div v-if="phase === 'loading'" class="quiz-phase quiz-phase--center">
        <div class="quiz-spinner"></div>
        <p class="quiz-hint">AI 正在为「{{ props.nodeTitle }}」生成专属测试题...</p>
      </div>

      <!-- Quiz phase -->
      <template v-if="phase === 'quiz'">
        <div class="quiz-questions">
          <div v-for="(q, qi) in questions" :key="qi" class="quiz-question">
            <p class="quiz-question__text">{{ qi + 1 }}. {{ q.question }}</p>
            <div class="quiz-options">
              <button
                v-for="(opt, oi) in q.options"
                :key="oi"
                class="quiz-option"
                :class="{ 'quiz-option--selected': selectedAnswers[qi] === oi }"
                @click="selectedAnswers[qi] = oi"
              >
                <span class="quiz-option__label">{{ ['A', 'B', 'C', 'D'][oi] }}</span>
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <div class="quiz-actions">
          <button class="quiz-btn quiz-btn--secondary" @click="emit('close')">取消</button>
          <button
            class="quiz-btn quiz-btn--primary"
            :disabled="!allAnswered || submitting"
            @click="submitAnswers"
          >
            {{ submitting ? '提交中...' : '提交答案' }}
          </button>
        </div>
      </template>

      <!-- Result phase -->
      <div v-if="phase === 'result'" class="quiz-phase quiz-phase--center">
        <!-- Error -->
        <template v-if="errorMsg">
          <div class="quiz-result-icon quiz-result-icon--fail">❌</div>
          <p class="quiz-result-msg" style="color: var(--color-error, #ef4444);">{{ errorMsg }}</p>
          <button class="quiz-btn quiz-btn--secondary quiz-btn--full" @click="emit('close')">关闭</button>
        </template>

        <!-- Passed -->
        <template v-else-if="passed">
          <div class="quiz-result-icon quiz-result-icon--pass">✅</div>
          <p class="quiz-result-title">恭喜通过！</p>
          <p class="quiz-result-sub">得分：{{ score }}/3 — 后续节点已解锁</p>

          <!-- EXP gain -->
          <div v-if="completeResult?.expGained" class="quiz-exp-gain">
            <span class="quiz-exp-float">+{{ completeResult.expGained }} EXP</span>
          </div>

          <!-- EXP progress bar -->
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

          <!-- Badges unlocked -->
          <div v-if="completeResult?.newBadges?.length" class="quiz-badges">
            <p class="quiz-badges__label">解锁成就</p>
            <div v-for="b in completeResult.newBadges" :key="b.id" class="quiz-badge-item">
              {{ b.name }}
            </div>
          </div>

          <button class="quiz-btn quiz-btn--primary quiz-btn--full" @click="emit('close')">继续学习</button>
        </template>

        <!-- Failed -->
        <template v-else>
          <div class="quiz-result-icon quiz-result-icon--fail">😓</div>
          <p class="quiz-result-title">未通过</p>
          <p class="quiz-result-sub">得分：{{ score }}/3，需至少 2 分通过</p>
          <div class="quiz-actions">
            <button class="quiz-btn quiz-btn--secondary" @click="emit('close')">关闭</button>
            <button class="quiz-btn quiz-btn--primary" @click="retry">重新作答</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.quiz-modal {
  width: 100%;
  max-width: 520px;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

.quiz-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quiz-modal__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.quiz-modal__close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: opacity 0.15s;
}

.quiz-modal__close:hover {
  opacity: 0.7;
}

.quiz-phase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-phase--center {
  align-items: center;
  padding: 16px 0;
}

.quiz-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--border-color);
  border-top-color: #7c3aed;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.quiz-hint {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
}

.quiz-questions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.quiz-question {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-question__text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  border: 1.5px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  line-height: 1.4;
}

.quiz-option:hover {
  border-color: rgba(124, 58, 237, 0.5);
  color: var(--text-primary);
}

.quiz-option--selected {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15));
  border-color: #7c3aed;
  color: var(--text-primary);
}

.quiz-option__label {
  font-weight: 700;
  flex-shrink: 0;
  color: var(--text-muted);
}

.quiz-option--selected .quiz-option__label {
  color: #7c3aed;
}

.quiz-actions {
  display: flex;
  gap: 10px;
}

.quiz-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  border: none;
}

.quiz-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.quiz-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quiz-btn--primary {
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  color: white;
}

.quiz-btn--secondary {
  background-color: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.quiz-btn--full {
  flex: none;
  width: 100%;
}

.quiz-result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.quiz-result-icon--pass {
  background: rgba(16, 185, 129, 0.15);
}

.quiz-result-icon--fail {
  background: rgba(239, 68, 68, 0.15);
}

.quiz-result-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.quiz-result-msg {
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.quiz-result-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.quiz-exp-gain {
  position: relative;
  height: 32px;
  display: flex;
  justify-content: center;
}

.quiz-exp-float {
  font-size: 20px;
  font-weight: 800;
  color: #fbbf24;
  animation: exp-float 1.2s ease-out both;
  display: inline-block;
}

@keyframes exp-float {
  0%   { transform: translateY(0);    opacity: 1; }
  60%  { transform: translateY(-20px); opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}

.quiz-exp-bar-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.quiz-exp-bar-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.quiz-exp-bar-track {
  height: 6px;
  border-radius: 99px;
  background: var(--bg-input);
  overflow: hidden;
}

.quiz-exp-bar-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #7c3aed, #fbbf24);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  animation: bar-grow 0.8s 0.3s ease both;
}

@keyframes bar-grow {
  from { width: 0 !important; }
}

.quiz-badges {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quiz-badges__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fbbf24;
  text-transform: uppercase;
  margin: 0;
}

.quiz-badge-item {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(124,58,237,0.1));
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: 8px;
  padding: 6px 10px;
  animation: badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes badge-pop {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
</style>
