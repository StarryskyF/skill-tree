<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { generateQuiz, completeNode } from '../../../../api/skill-trees'
import type { QuizQuestion, NodeStatus } from '../../../../api/skill-trees'

const props = defineProps<{
  treeId: string
  nodeId: string
  nodeTitle: string
}>()

const emit = defineEmits<{
  complete: [newStatuses: Record<string, NodeStatus>]
  close: []
}>()

type Phase = 'loading' | 'quiz' | 'result'
const phase = ref<Phase>('loading')
const errorMsg = ref('')
const questions = ref<QuizQuestion[]>([])
const selectedAnswers = ref<number[]>([-1, -1, -1])
const passed = ref(false)
const score = ref(0)
const submitting = ref(false)

const allAnswered = computed(() => selectedAnswers.value.every((a) => a !== -1))

onMounted(async () => {
  try {
    const res = await generateQuiz(props.treeId, props.nodeId)
    if (!res.data) throw new Error(res.message || '生成失败')
    questions.value = res.data
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
    if (res.data.passed) {
      emit('complete', res.data.newStatuses)
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
</style>
