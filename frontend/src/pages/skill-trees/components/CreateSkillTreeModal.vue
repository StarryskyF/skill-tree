<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { createSkillTree } from '../../../api/skill-trees'

const emit = defineEmits<{
  close: []
  success: []
}>()

const goal = ref('')
const currentLevel = ref('')
const phase = ref<'form' | 'generating' | 'done' | 'error'>('form')
const progressPercent = ref(0)
const progressMessage = ref('')
const errorMessage = ref('')
const pdfFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

let es: EventSource | null = null

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f && f.type === 'application/pdf' && f.size <= 10 * 1024 * 1024) {
    pdfFile.value = f
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
  progressMessage.value = pdfFile.value ? '正在处理资料...' : '正在提交请求...'

  try {
    const res = await createSkillTree(
      { goal: goal.value.trim(), currentLevel: currentLevel.value.trim() },
      pdfFile.value ?? undefined,
    )
    if (!res.data) throw new Error('创建失败')

    const id = res.data._id
    const token = (() => {
      try { return JSON.parse(localStorage.getItem('auth') || '{}')?.token ?? '' }
      catch { return '' }
    })()

    es = new EventSource(`/api/skill-trees/${id}/progress?token=${token}`)

    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data)
      progressPercent.value = d.percent
      progressMessage.value = d.message
    })

    es.addEventListener('complete', () => {
      progressPercent.value = 100
      progressMessage.value = '生成完成！'
      phase.value = 'done'
      es?.close()
      setTimeout(() => emit('success'), 1500)
    })

    es.addEventListener('error', (e) => {
      let msg = '生成失败，请重试'
      try { msg = JSON.parse((e as MessageEvent).data)?.message ?? msg } catch {}
      errorMessage.value = msg
      phase.value = 'error'
      es?.close()
    })

    es.onerror = () => {
      if (phase.value === 'generating') {
        errorMessage.value = '连接中断，请重试'
        phase.value = 'error'
        es?.close()
      }
    }
  } catch {
    errorMessage.value = '请求失败，请检查网络后重试'
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
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold" style="color: var(--text-primary);">
          {{ phase === 'form' ? '创建新技能树' : phase === 'generating' ? 'AI 正在生成...' : phase === 'done' ? '生成成功！' : '生成失败' }}
        </h2>
        <button
          v-if="phase !== 'generating'"
          @click="handleClose"
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-muted);"
        >
          ✕
        </button>
      </div>

      <!-- Phase: form -->
      <template v-if="phase === 'form'">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">学习目标</label>
            <textarea
              v-model="goal"
              rows="3"
              placeholder="例如：学会 Vue 3 并能独立开发项目"
              class="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">当前水平</label>
            <textarea
              v-model="currentLevel"
              rows="3"
              placeholder="例如：有 JavaScript 基础，没接触过前端框架"
              class="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              style="background-color: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            />
          </div>
          <!-- PDF upload -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--text-secondary);">
              参考资料 <span style="color: var(--text-muted); font-weight: 400;">（可选，PDF，10MB 以内）</span>
            </label>
            <div
              v-if="!pdfFile"
              class="flex items-center justify-center gap-2 rounded-xl py-4 cursor-pointer transition-colors"
              style="border: 1.5px dashed var(--border-color); background-color: var(--bg-input); color: var(--text-muted);"
              @click="fileInputRef?.click()"
            >
              <span style="font-size: 18px;">📄</span>
              <span class="text-sm">点击上传 PDF</span>
            </div>
            <div
              v-else
              class="flex items-center justify-between rounded-xl px-4 py-3"
              style="border: 1.5px solid rgba(124,58,237,0.4); background: rgba(124,58,237,0.06);"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span>📄</span>
                <span class="text-sm truncate" style="color: var(--text-primary);">{{ pdfFile.name }}</span>
              </div>
              <button class="text-xs ml-2 flex-shrink-0 cursor-pointer" style="color: var(--text-muted);" @click="removeFile">✕</button>
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
            取消
          </button>
          <button
            @click="submit"
            :disabled="!goal.trim() || !currentLevel.trim()"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white;"
          >
            开始生成
          </button>
        </div>
      </template>

      <!-- Phase: generating -->
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
          <p class="text-xs text-center" style="color: var(--text-muted);">AI 正在为你定制专属学习路径，请稍候...</p>
        </div>
      </template>

      <!-- Phase: done -->
      <template v-if="phase === 'done'">
        <div class="flex flex-col items-center gap-3 py-4">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style="background: rgba(16,185,129,0.15);"
          >
            ✅
          </div>
          <p class="text-sm" style="color: var(--text-secondary);">技能树已生成，即将跳转...</p>
        </div>
      </template>

      <!-- Phase: error -->
      <template v-if="phase === 'error'">
        <div class="flex flex-col items-center gap-3 py-2">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style="background: rgba(239,68,68,0.15);"
          >
            ❌
          </div>
          <p class="text-sm text-center" style="color: #ef4444;">{{ errorMessage }}</p>
          <p class="text-xs text-center" style="color: var(--text-muted);">你可以关闭后重试，或联系管理员</p>
        </div>
        <button
          @click="handleClose"
          class="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          关闭
        </button>
      </template>
    </div>
  </div>
</template>
