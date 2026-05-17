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
const loading = ref(false)

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 32
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 16

function validateLoginForm() {
  const trimmedUsername = username.value.trim()

  if (!trimmedUsername || !password.value) {
    ElMessage.warning(t('auth.validationRequiredLogin'))
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
  return true
}

async function handleLogin() {
  if (!validateLoginForm()) return
  loading.value = true
  try {
    await auth.loginAction(username.value, password.value)
    router.push('/')
  } catch (err: any) {
    ElMessage.error(err.message || t('auth.loginFailed'))
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
      style="background: linear-gradient(135deg, #1a0533 0%, #0f0f1a 50%, #0a1628 100%);"
    >
      <div class="absolute inset-0 opacity-20">
        <div
          v-for="i in 20"
          :key="i"
          class="absolute rounded-full border border-brand-500"
          :style="{
            width: `${12 + (i % 5) * 8}px`,
            height: `${12 + (i % 5) * 8}px`,
            top: `${(i * 17 + 10) % 90}%`,
            left: `${(i * 23 + 5) % 88}%`,
            opacity: 0.3 + (i % 4) * 0.15,
          }"
        />
      </div>
      <svg class="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <line x1="20%" y1="30%" x2="50%" y2="55%" stroke="#8b5cf6" stroke-width="1" />
        <line x1="50%" y1="55%" x2="75%" y2="40%" stroke="#8b5cf6" stroke-width="1" />
        <line x1="50%" y1="55%" x2="60%" y2="80%" stroke="#06b6d4" stroke-width="1" />
        <line x1="20%" y1="30%" x2="35%" y2="15%" stroke="#06b6d4" stroke-width="1" />
        <circle cx="20%" cy="30%" r="4" fill="#8b5cf6" />
        <circle cx="50%" cy="55%" r="6" fill="#8b5cf6" />
        <circle cx="75%" cy="40%" r="4" fill="#06b6d4" />
        <circle cx="60%" cy="80%" r="4" fill="#8b5cf6" />
        <circle cx="35%" cy="15%" r="3" fill="#06b6d4" />
      </svg>

      <div class="relative z-10 text-center px-12">
        <div class="flex items-center justify-center mb-6">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            ST
          </div>
        </div>
        <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">{{ t('common.appName') }}</h1>
        <p class="text-lg mb-8" style="color: #a78bfa;">{{ t('brand.tagline') }}</p>

        <div class="space-y-4 text-left">
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-brand-300">01</span>
            <div>
              <p class="text-white font-medium text-sm">{{ t('brand.featureTreeTitle') }}</p>
              <p class="text-xs" style="color: #64748b;">{{ t('brand.featureTreeDesc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-brand-300">02</span>
            <div>
              <p class="text-white font-medium text-sm">{{ t('brand.featureRewardTitle') }}</p>
              <p class="text-xs" style="color: #64748b;">{{ t('brand.featureRewardDesc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5 text-brand-300">03</span>
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
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            ST
          </div>
          <span class="text-lg font-bold" style="color: var(--text-primary);">{{ t('common.appName') }}</span>
        </div>

        <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">{{ t('auth.welcomeBack') }}</h2>
        <p class="text-sm mb-8" style="color: var(--text-muted);">{{ t('auth.loginSubtitle') }}</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">{{ t('auth.username') }}</label>
            <input
              v-model="username"
              type="text"
              :maxlength="USERNAME_MAX_LENGTH"
              :placeholder="t('auth.usernamePlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
              @keyup.enter="handleLogin"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">{{ t('auth.password') }}</label>
            <input
              v-model="password"
              type="password"
              :maxlength="PASSWORD_MAX_LENGTH"
              :placeholder="t('auth.passwordPlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
              @keyup.enter="handleLogin"
            />
          </div>

          <button
            @click="handleLogin"
            :disabled="loading"
            class="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 cursor-pointer"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            <span v-if="loading">{{ t('auth.loggingIn') }}</span>
            <span v-else>{{ t('auth.login') }}</span>
          </button>
        </div>

        <p class="mt-6 text-center text-sm" style="color: var(--text-muted);">
          {{ t('auth.noAccount') }}
          <router-link to="/register" class="font-medium hover:underline" style="color: #8b5cf6;">{{ t('auth.registerNow') }}</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
