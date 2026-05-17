<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { useI18n } from '../../i18n'
import ThemeToggle from '../../components/ThemeToggle.vue'
import LanguageToggle from '../../components/LanguageToggle.vue'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 32
const NAME_MAX_LENGTH = 30
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 16

function validateRegisterForm() {
  const trimmedUsername = username.value.trim()
  const trimmedName = name.value.trim()

  if (!trimmedName || !trimmedUsername || !password.value) {
    ElMessage.warning(t('auth.validationRequiredRegister'))
    return false
  }
  if (trimmedName.length > NAME_MAX_LENGTH) {
    ElMessage.warning(t('auth.validationNameLength', { max: NAME_MAX_LENGTH }))
    return false
  }
  if (trimmedUsername.length < USERNAME_MIN_LENGTH || trimmedUsername.length > USERNAME_MAX_LENGTH) {
    ElMessage.warning(t('auth.validationUsernameLength', { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH }))
    return false
  }
  if (password.value.length < PASSWORD_MIN_LENGTH || password.value.length > PASSWORD_MAX_LENGTH) {
    ElMessage.warning(t('auth.validationPasswordLength', { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH }))
    return false
  }

  username.value = trimmedUsername
  name.value = trimmedName
  return true
}

async function handleRegister() {
  if (!validateRegisterForm()) return
  loading.value = true
  try {
    await auth.registerAction(username.value, password.value, name.value)
    ElMessage.success(t('auth.registerSuccess'))
    router.push('/login')
  } catch (err: any) {
    ElMessage.error(err.message || t('auth.registerFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex" style="background-color: var(--bg-page);">
    <div class="fixed top-4 right-4 z-10 flex items-center gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>

    <div
      class="hidden lg:flex flex-col justify-center items-center w-1/2 relative overflow-hidden"
      style="background: linear-gradient(135deg, #0a1628 0%, #0f0f1a 50%, #1a0533 100%);"
    >
      <div class="absolute inset-0 opacity-20">
        <div
          v-for="i in 20"
          :key="i"
          class="absolute rounded-full border border-accent-500"
          :style="{
            width: `${10 + (i % 6) * 7}px`,
            height: `${10 + (i % 6) * 7}px`,
            top: `${(i * 19 + 8) % 92}%`,
            left: `${(i * 31 + 3) % 90}%`,
            opacity: 0.2 + (i % 5) * 0.12,
          }"
        />
      </div>
      <svg class="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <line x1="30%" y1="20%" x2="55%" y2="45%" stroke="#06b6d4" stroke-width="1" />
        <line x1="55%" y1="45%" x2="80%" y2="30%" stroke="#8b5cf6" stroke-width="1" />
        <line x1="55%" y1="45%" x2="45%" y2="75%" stroke="#06b6d4" stroke-width="1" />
        <line x1="45%" y1="75%" x2="70%" y2="85%" stroke="#8b5cf6" stroke-width="1" />
        <circle cx="30%" cy="20%" r="4" fill="#06b6d4" />
        <circle cx="55%" cy="45%" r="6" fill="#06b6d4" />
        <circle cx="80%" cy="30%" r="4" fill="#8b5cf6" />
        <circle cx="45%" cy="75%" r="4" fill="#06b6d4" />
        <circle cx="70%" cy="85%" r="3" fill="#8b5cf6" />
      </svg>

      <div class="relative z-10 text-center px-12">
        <div class="flex items-center justify-center mb-6">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
            style="background: linear-gradient(135deg, #06b6d4, #7c3aed);"
          >
            ST
          </div>
        </div>
        <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">{{ t('auth.createAccount') }}</h1>
        <p class="text-lg mb-8" style="color: #22d3ee;">{{ t('auth.registerSubtitle') }}</p>

        <div class="space-y-4 text-left">
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-cyan-300">01</span>
            <div>
              <p class="text-white font-medium text-sm">{{ t('brand.featureTreeTitle') }}</p>
              <p class="text-xs" style="color: #64748b;">{{ t('brand.featureTreeDesc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-cyan-300">02</span>
            <div>
              <p class="text-white font-medium text-sm">{{ t('brand.featureRewardTitle') }}</p>
              <p class="text-xs" style="color: #64748b;">{{ t('brand.featureRewardDesc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-cyan-300">03</span>
            <div>
              <p class="text-white font-medium text-sm">{{ t('brand.featureTutorTitle') }}</p>
              <p class="text-xs" style="color: #64748b;">{{ t('brand.featureTutorDesc') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div
        class="w-full max-w-md rounded-2xl p-8"
        style="background-color: var(--bg-card); box-shadow: var(--shadow-card); border: 1px solid var(--border-color);"
      >
        <div class="flex items-center gap-3 mb-8 lg:hidden">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white"
            style="background: linear-gradient(135deg, #06b6d4, #7c3aed);"
          >
            ST
          </div>
          <span class="text-lg font-bold" style="color: var(--text-primary);">{{ t('common.appName') }}</span>
        </div>

        <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">{{ t('auth.createAccount') }}</h2>
        <p class="text-sm mb-8" style="color: var(--text-muted);">{{ t('auth.registerSubtitle') }}</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">{{ t('auth.name') }}</label>
            <input
              v-model="name"
              type="text"
              :maxlength="NAME_MAX_LENGTH"
              :placeholder="t('auth.namePlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">{{ t('auth.username') }}</label>
            <input
              v-model="username"
              type="text"
              :maxlength="USERNAME_MAX_LENGTH"
              :placeholder="t('auth.usernamePlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">{{ t('auth.password') }}</label>
            <input
              v-model="password"
              type="password"
              :maxlength="PASSWORD_MAX_LENGTH"
              :placeholder="t('auth.passwordRegisterPlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
              @keyup.enter="handleRegister"
            />
          </div>

          <button
            @click="handleRegister"
            :disabled="loading"
            class="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 cursor-pointer"
            style="background: linear-gradient(135deg, #06b6d4, #7c3aed);"
          >
            <span v-if="loading">{{ t('auth.registering') }}</span>
            <span v-else>{{ t('auth.register') }}</span>
          </button>
        </div>

        <p class="mt-6 text-center text-sm" style="color: var(--text-muted);">
          {{ t('auth.hasAccount') }}
          <router-link to="/login" class="font-medium hover:underline" style="color: #8b5cf6;">{{ t('auth.loginNow') }}</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
