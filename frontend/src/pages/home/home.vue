<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ThemeToggle from '../../components/ThemeToggle.vue'
import EditProfileModal from './components/EditProfileModal.vue'

const router = useRouter()
const auth = useAuthStore()
const showEditModal = ref(false)

const stats = [
  { icon: '⭐', value: '0', label: '已完成节点' },
  { icon: '🔥', value: '0', label: '连续学习天数' },
  { icon: '💎', value: '0', label: '经验值 EXP' },
  { icon: '🏆', value: '0', label: '技能树数量' },
]

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-page);">
    <!-- Navbar -->
    <nav
      class="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur-sm"
      style="background-color: var(--bg-card); border-bottom: 1px solid var(--border-color);"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
        >
          🌳
        </div>
        <span class="font-bold text-base" style="color: var(--text-primary);">Skill Tree</span>
      </div>

      <div class="flex items-center gap-3">
        <ThemeToggle />
        <button
          @click="logout"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80 cursor-pointer"
          style="background-color: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);"
        >
          退出
        </button>
      </div>
    </nav>

    <!-- Main content -->
    <main class="max-w-4xl mx-auto px-6 py-10">
      <!-- Welcome section -->
      <div
        class="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style="background: linear-gradient(135deg, #4c1d95 0%, #0e7490 100%); box-shadow: 0 8px 32px rgba(124, 58, 237, 0.3);"
      >
        <div class="relative z-10 flex items-start justify-between">
          <div>
            <p class="text-sm font-medium mb-2" style="color: #c4b5fd;">欢迎回来</p>
            <h1 class="text-3xl font-bold text-white mb-1">{{ auth.user?.name }}</h1>
            <p class="text-sm" style="color: #a5f3fc;">@{{ auth.user?.username }}</p>
            <button
              @click="showEditModal = true"
              class="mt-3 text-xs px-3 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
              style="background: rgba(255,255,255,0.15); color: #e9d5ff; border: 1px solid rgba(255,255,255,0.25);"
            >
              ✏️ 编辑资料
            </button>
          </div>
          <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style="border: 2px solid rgba(255,255,255,0.3);">
            <img
              v-if="auth.user?.avatar"
              :src="auth.user.avatar"
              class="w-full h-full object-cover"
              alt="头像"
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

      <!-- Stats grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-xl p-5 flex flex-col gap-2"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
        >
          <span class="text-2xl">{{ stat.icon }}</span>
          <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ stat.value }}</p>
          <p class="text-xs" style="color: var(--text-muted);">{{ stat.label }}</p>
        </div>
      </div>

      <!-- Action cards -->
      <div class="grid md:grid-cols-2 gap-4">
        <div
          class="rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style="background: linear-gradient(135deg, rgba(124,58,237,0.13), rgba(124,58,237,0.27));"
            >
              🗺️
            </div>
            <h3 class="font-semibold" style="color: var(--text-primary);">我的技能树</h3>
          </div>
          <p class="text-sm" style="color: var(--text-muted);">查看并继续你的学习路径，解锁新节点</p>
          <div class="mt-4 flex items-center gap-1.5" style="color: #8b5cf6;">
            <span class="text-sm font-medium">开始学习</span>
            <span class="text-xs group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </div>

        <div
          class="rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
          style="background-color: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style="background: linear-gradient(135deg, rgba(6,182,212,0.13), rgba(6,182,212,0.27));"
            >
              ✨
            </div>
            <h3 class="font-semibold" style="color: var(--text-primary);">创建新目标</h3>
          </div>
          <p class="text-sm" style="color: var(--text-muted);">告诉 AI 你想学什么，自动生成专属技能树</p>
          <div class="mt-4 flex items-center gap-1.5" style="color: #06b6d4;">
            <span class="text-sm font-medium">立即创建</span>
            <span class="text-xs group-hover:translate-x-1 transition-transform duration-200">→</span>
          </div>
        </div>
      </div>
    </main>

    <EditProfileModal v-if="showEditModal" @close="showEditModal = false" />
  </div>
</template>
