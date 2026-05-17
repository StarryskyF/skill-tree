<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { userApi } from '../../api/user'
import type { UserStats } from '../../api/user'
import { useI18n } from '../../i18n'
import ThemeToggle from '../../components/ThemeToggle.vue'
import LanguageToggle from '../../components/LanguageToggle.vue'
import EditProfileModal from './components/EditProfileModal.vue'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const showEditModal = ref(false)
const userStats = ref<UserStats | null>(null)

const stats = computed(() => [
  { icon: '✓', value: String(userStats.value?.completedNodeCount ?? 0), label: t('home.completedNodes') },
  { icon: 'S', value: String(userStats.value?.streakDays ?? 0), label: t('home.streakDays') },
  { icon: 'XP', value: String(userStats.value?.totalExp ?? 0), label: t('home.totalExp') },
  { icon: 'T', value: String(userStats.value?.treeCount ?? 0), label: t('home.treeCount') },
])

onMounted(async () => {
  const res = await userApi.getStats()
  if (res.data) userStats.value = res.data
})

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-page);">
    <nav
      class="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur-sm"
      style="background-color: var(--bg-card); border-bottom: 1px solid var(--border-color);"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
          style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
        >
          ST
        </div>
        <span class="font-bold text-base" style="color: var(--text-primary);">{{ t('common.appName') }}</span>
      </div>

      <div class="flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
        <button
          @click="logout"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          {{ t('home.logout') }}
        </button>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-6 py-10">
      <div
        class="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style="background: linear-gradient(135deg, #4c1d95 0%, #0e7490 100%); box-shadow: 0 8px 32px rgba(124, 58, 237, 0.3);"
      >
        <div class="relative z-10 flex items-start justify-between">
          <div>
            <p class="text-sm font-medium mb-2" style="color: #c4b5fd;">{{ t('home.welcome') }}</p>
            <h1 class="text-3xl font-bold text-white mb-1">{{ auth.user?.name }}</h1>
            <p class="text-sm" style="color: #a5f3fc;">@{{ auth.user?.username }}</p>
            <button
              @click="showEditModal = true"
              class="mt-3 text-xs px-3 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
              style="background: rgba(255,255,255,0.15); color: #e9d5ff; border: 1px solid rgba(255,255,255,0.25);"
            >
              {{ t('home.editProfile') }}
            </button>
          </div>
          <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style="border: 2px solid rgba(255,255,255,0.3);">
            <img
              v-if="auth.user?.avatar"
              :src="auth.user.avatar"
              class="w-full h-full object-cover"
              :alt="t('home.avatarAlt')"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
              style="background: rgba(255,255,255,0.15);"
            >
              {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>
        <div class="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div class="absolute -right-4 -bottom-12 w-56 h-56 rounded-full opacity-10 bg-white" />
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-xl p-5 flex flex-col gap-2"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
        >
          <span class="text-lg font-black" style="color: #8b5cf6;">{{ stat.icon }}</span>
          <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ stat.value }}</p>
          <p class="text-xs" style="color: var(--text-muted);">{{ stat.label }}</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div
          class="rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
          @click="router.push('/skill-trees')"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
              style="background: linear-gradient(135deg, rgba(124,58,237,0.13), rgba(124,58,237,0.27)); color: #8b5cf6;"
            >
              ST
            </div>
            <h3 class="font-semibold" style="color: var(--text-primary);">{{ t('home.manageTrees') }}</h3>
          </div>
          <p class="text-sm" style="color: var(--text-muted);">{{ t('home.manageTreesDesc') }}</p>
          <div class="mt-4 flex items-center gap-1.5" style="color: #8b5cf6;">
            <span class="text-sm font-medium">{{ t('home.enterWorkspace') }}</span>
            <span class="text-xs group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </div>

        <div
          class="rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
          @click="router.push('/skill-trees')"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black"
              style="background: linear-gradient(135deg, rgba(6,182,212,0.13), rgba(6,182,212,0.27)); color: #06b6d4;"
            >
              +
            </div>
            <h3 class="font-semibold" style="color: var(--text-primary);">{{ t('home.createTree') }}</h3>
          </div>
          <p class="text-sm" style="color: var(--text-muted);">{{ t('home.createTreeDesc') }}</p>
          <div class="mt-4 flex items-center gap-1.5" style="color: #06b6d4;">
            <span class="text-sm font-medium">{{ t('home.startCreate') }}</span>
            <span class="text-xs group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </div>
      </div>
    </main>

    <EditProfileModal v-if="showEditModal" @close="showEditModal = false" />
  </div>
</template>
