<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { createSkillTree } from '../../../api/skill-trees'
import { useI18n } from '../../../i18n'

const emit = defineEmits<{
  close: []
  success: []
}>()

const { locale, t } = useI18n()
const goal = ref('')
const currentLevel = ref('')
const phase = ref<'form' | 'generating' | 'done' | 'error'>('form')
const progressPercent = ref(0)
const progressMessage = ref('')
const errorMessage = ref('')
const pdfFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

let es: EventSource | null = null

const title = computed(() => {
  if (phase.value === 'generating') return t('createTree.titleGenerating')
  if (phase.value === 'done') return t('createTree.titleDone')
  if (phase.value === 'error') return t('createTree.titleError')
  return t('createTree.titleForm')
})

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
    pdfFile.value = file
  }
}

function removeFile() {
  pdfFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function submit() {
  if (!goal.value.trim() || !currentLevel.value.trim()) return

  phase.value = 'generating'
  progressPercent.value = 10
  progressMessage.value = pdfFile.value ? t('createTree.processingPdf') : t('createTree.submitting')

  try {
    const res = await createSkillTree(
      { goal: goal.value.trim(), currentLevel: currentLevel.value.trim(), language: locale.value },
      pdfFile.value ?? undefined,
    )
    if (!res.data) throw new Error(t('createTree.createFailed'))

    const id = res.data._id
    const token = (() => {
      try { return JSON.parse(localStorage.getItem('auth') || '{}')?.token ?? '' }
      catch { return '' }
    })()

    es = new EventSource(`/api/skill-trees/${id}/progress?token=${token}&language=${locale.value}`)

    es.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data)
      progressPercent.value = Math.max(progressPercent.value, data.percent)
      progressMessage.value = data.message
    })

    es.addEventListener('complete', () => {
      progressPercent.value = 100
      progressMessage.value = t('createTree.generatingDone')
      phase.value = 'done'
      es?.close()
      setTimeout(() => emit('success'), 1500)
    })

    es.addEventListener('error', (event) => {
      let message = t('common.generateFailed')
      try { message = JSON.parse((event as MessageEvent).data)?.message ?? message } catch {}
      errorMessage.value = message
      phase.value = 'error'
      es?.close()
    })

    es.onerror = () => {
      if (phase.value === 'generating') {
        errorMessage.value = t('createTree.connectionLost')
        phase.value = 'error'
        es?.close()
      }
    }
  } catch {
    errorMessage.value = t('common.requestFailed')
    phase.value = 'error'
  }
}

function handleClose() {
  if (phase.value === 'generating') return
  es?.close()
  emit('close')
}

onUnmounted(() => es?.close())
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
      style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 24px 64px rgba(0,0,0,0.4);"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold" style="color: var(--text-primary);">{{ title }}</h2>
        <button
          v-if="phase !== 'generating'"
          @click="handleClose"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-muted);"
        >
          ×
        </button>
      </div>

      <template v-if="phase === 'form'">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">{{ t('createTree.goal') }}</label>
            <textarea
              v-model="goal"
              rows="3"
              :placeholder="t('createTree.goalPlaceholder')"
              class="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">{{ t('createTree.currentLevel') }}</label>
            <textarea
              v-model="currentLevel"
              rows="3"
              :placeholder="t('createTree.currentLevelPlaceholder')"
              class="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">
              {{ t('createTree.reference') }} <span style="color: var(--text-muted); font-weight: 400;">{{ t('createTree.referenceHint') }}</span>
            </label>
            <div
              v-if="!pdfFile"
              class="flex items-center justify-center gap-2 rounded-xl py-4 cursor-pointer transition-colors"
              style="border: 1.5px dashed var(--border-color); background-color: var(--bg-input); color: var(--text-muted);"
              @click="fileInputRef?.click()"
            >
              <span class="text-sm font-semibold">PDF</span>
              <span class="text-sm">{{ t('createTree.uploadPdf') }}</span>
            </div>
            <div
              v-else
              class="flex items-center justify-between rounded-xl px-4 py-3"
              style="border: 1.5px solid rgba(124,58,237,0.4); background: rgba(124,58,237,0.06);"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-semibold">PDF</span>
                <span class="text-sm truncate" style="color: var(--text-primary);">{{ pdfFile.name }}</span>
              </div>
              <button class="text-xs ml-2 flex-shrink-0 cursor-pointer" style="color: var(--text-muted);" @click="removeFile">×</button>
            </div>
            <input ref="fileInputRef" type="file" accept=".pdf" class="hidden" @change="onFileChange" />
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="handleClose"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
            style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="submit"
            :disabled="!goal.trim() || !currentLevel.trim()"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white;"
          >
            {{ t('createTree.start') }}
          </button>
        </div>
      </template>

      <template v-if="phase === 'generating'">
        <div class="flex flex-col gap-4 py-2">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-sm">
              <span style="color: var(--text-secondary);">{{ progressMessage }}</span>
              <span class="font-semibold" style="color: var(--color-brand-500);">{{ progressPercent }}%</span>
            </div>
            <div class="h-2 rounded-full overflow-hidden" style="background-color: var(--bg-input);">
              <div
                class="h-full rounded-full transition-all duration-700"
                style="background: linear-gradient(90deg, #7c3aed, #06b6d4);"
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
          </div>
          <p class="text-xs text-center" style="color: var(--text-muted);">{{ t('createTree.generatingHint') }}</p>
        </div>
      </template>

      <template v-if="phase === 'done'">
        <div class="flex flex-col items-center gap-3 py-4">
          <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black" style="background: rgba(16,185,129,0.15); color: #10b981;">
            ✓
          </div>
          <p class="text-sm" style="color: var(--text-secondary);">{{ t('createTree.doneHint') }}</p>
        </div>
      </template>

      <template v-if="phase === 'error'">
        <div class="flex flex-col items-center gap-3 py-2">
          <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black" style="background: rgba(239,68,68,0.15); color: #ef4444;">
            !
          </div>
          <p class="text-sm text-center" style="color: #ef4444;">{{ errorMessage }}</p>
          <p class="text-xs text-center" style="color: var(--text-muted);">{{ t('createTree.errorHint') }}</p>
        </div>
        <button
          @click="handleClose"
          class="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          {{ t('common.close') }}
        </button>
      </template>
    </div>
  </div>
</template>
