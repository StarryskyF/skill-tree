<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../../../stores/auth'
import { userApi } from '../../../api/user'
import { useI18n } from '../../../i18n'

const auth = useAuthStore()
const { t } = useI18n()
const emit = defineEmits<{ (e: 'close'): void }>()

const activeTab = ref<'profile' | 'password' | 'avatar'>('profile')
const tabs = computed(() => [
  { key: 'profile' as const, label: t('profile.basicInfo') },
  { key: 'password' as const, label: t('profile.password') },
  { key: 'avatar' as const, label: t('profile.avatar') },
])

const name = ref(auth.user?.name ?? '')
const profileMsg = ref('')
const profileError = ref(false)
async function saveProfile() {
  profileMsg.value = ''
  try {
    const res = await userApi.updateProfile(name.value)
    if (res.success && res.data) {
      auth.updateUser({ name: res.data.name })
      profileMsg.value = t('profile.saveSuccess')
      profileError.value = false
    }
  } catch (e: any) {
    profileMsg.value = e?.response?.data?.message ?? t('profile.saveFailed')
    profileError.value = true
  }
}

const oldPassword = ref('')
const newPassword = ref('')
const passwordMsg = ref('')
const passwordError = ref(false)
async function savePassword() {
  passwordMsg.value = ''
  try {
    const res = await userApi.updatePassword(oldPassword.value, newPassword.value)
    if (res.success) {
      passwordMsg.value = t('profile.passwordSuccess')
      passwordError.value = false
      oldPassword.value = ''
      newPassword.value = ''
    }
  } catch (e: any) {
    passwordMsg.value = e?.response?.data?.message ?? t('profile.passwordFailed')
    passwordError.value = true
  }
}

const avatarPreview = ref<string | null>(auth.user?.avatar ?? null)
const avatarFile = ref<File | null>(null)
const avatarMsg = ref('')
const avatarError = ref(false)
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    avatarFile.value = file
    avatarPreview.value = URL.createObjectURL(file)
  }
}
async function uploadAvatar() {
  if (!avatarFile.value) return
  avatarMsg.value = ''
  try {
    const res = await userApi.uploadAvatar(avatarFile.value)
    if (res.success && res.data) {
      auth.updateUser({ avatar: res.data.avatar })
      avatarMsg.value = t('profile.avatarSuccess')
      avatarError.value = false
    }
  } catch (e: any) {
    avatarMsg.value = e?.response?.data?.message ?? t('profile.avatarFailed')
    avatarError.value = true
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background: rgba(0,0,0,0.6);"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-2xl p-6 relative"
      style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 20px 60px rgba(0,0,0,0.4);"
    >
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold" style="color: var(--text-primary);">{{ t('profile.title') }}</h2>
        <button
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary);"
        >
          ×
        </button>
      </div>

      <div class="flex gap-0 mb-6" style="border-bottom: 1px solid var(--border-color);">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer"
          :style="activeTab === tab.key
            ? 'color: #8b5cf6; border-bottom: 2px solid #8b5cf6; margin-bottom: -1px;'
            : 'color: var(--text-secondary); border-bottom: 2px solid transparent; margin-bottom: -1px;'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'profile'" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" style="color: var(--text-secondary);">{{ t('profile.nickname') }}</label>
          <input
            v-model="name"
            type="text"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            :placeholder="t('profile.nicknamePlaceholder')"
          />
        </div>
        <button
          @click="saveProfile"
          class="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          style="background: linear-gradient(135deg, #7c3aed, #6d28d9);"
        >
          {{ t('common.save') }}
        </button>
        <p v-if="profileMsg" class="text-sm text-center" :style="profileError ? 'color: #f87171;' : 'color: #4ade80;'">
          {{ profileMsg }}
        </p>
      </div>

      <div v-if="activeTab === 'password'" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" style="color: var(--text-secondary);">{{ t('profile.currentPassword') }}</label>
          <input
            v-model="oldPassword"
            type="password"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            :placeholder="t('profile.currentPasswordPlaceholder')"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" style="color: var(--text-secondary);">{{ t('profile.newPassword') }}</label>
          <input
            v-model="newPassword"
            type="password"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color);"
            :placeholder="t('profile.newPasswordPlaceholder')"
          />
        </div>
        <button
          @click="savePassword"
          class="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          style="background: linear-gradient(135deg, #7c3aed, #6d28d9);"
        >
          {{ t('profile.confirmPasswordChange') }}
        </button>
        <p v-if="passwordMsg" class="text-sm text-center" :style="passwordError ? 'color: #f87171;' : 'color: #4ade80;'">
          {{ passwordMsg }}
        </p>
      </div>

      <div v-if="activeTab === 'avatar'" class="flex flex-col items-center gap-4">
        <div class="w-24 h-24 rounded-full overflow-hidden flex-shrink-0" style="border: 2px solid var(--border-color);">
          <img
            v-if="avatarPreview"
            :src="avatarPreview"
            class="w-full h-full object-cover"
            :alt="t('profile.avatarPreview')"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
          </div>
        </div>

        <input id="avatar-file-input" type="file" accept="image/*" class="hidden" @change="onFileChange" />

        <label
          for="avatar-file-input"
          class="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          {{ t('profile.upload') }}
        </label>

        <button
          @click="uploadAvatar"
          :disabled="!avatarFile"
          class="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity cursor-pointer"
          :style="avatarFile
            ? 'background: linear-gradient(135deg, #7c3aed, #6d28d9); opacity: 1;'
            : 'background: linear-gradient(135deg, #7c3aed, #6d28d9); opacity: 0.45; cursor: not-allowed;'"
        >
          {{ t('profile.uploadAvatar') }}
        </button>

        <p v-if="avatarMsg" class="text-sm text-center" :style="avatarError ? 'color: #f87171;' : 'color: #4ade80;'">
          {{ avatarMsg }}
        </p>
      </div>
    </div>
  </div>
</template>
