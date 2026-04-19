<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import ThemeToggle from '../../components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return
  loading.value = true
  try {
    await auth.loginAction(username.value, password.value)
    router.push('/')
  } catch (err: any) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex" style="background-color: var(--bg-page);">
    <!-- Theme toggle -->
    <div class="fixed top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    <!-- Left: Brand Panel -->
    <div
      class="hidden lg:flex flex-col justify-center items-center w-1/2 relative overflow-hidden"
      style="background: linear-gradient(135deg, #1a0533 0%, #0f0f1a 50%, #0a1628 100%);"
    >
      <!-- Decorative node grid -->
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
      <!-- Connecting lines SVG -->
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

      <!-- Brand content -->
      <div class="relative z-10 text-center px-12">
        <div class="flex items-center justify-center mb-6">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            🌳
          </div>
        </div>
        <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">Skill Tree</h1>
        <p class="text-lg mb-8" style="color: #a78bfa;">AI 驱动的游戏化学习系统</p>

        <div class="space-y-4 text-left">
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">🔮</span>
            <div>
              <p class="text-white font-medium text-sm">智能技能树生成</p>
              <p class="text-xs" style="color: #64748b;">AI 自动规划你的学习路径</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">⚡</span>
            <div>
              <p class="text-white font-medium text-sm">游戏化激励机制</p>
              <p class="text-xs" style="color: #64748b;">解锁节点，积累经验值</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">🎯</span>
            <div>
              <p class="text-white font-medium text-sm">个性化 AI 辅导</p>
              <p class="text-xs" style="color: #64748b;">基于你的进度精准推荐</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Login Form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div
        class="w-full max-w-md rounded-2xl p-8"
        style="background-color: var(--bg-card); box-shadow: var(--shadow-card); border: 1px solid var(--border-color);"
      >
        <!-- Mobile logo -->
        <div class="flex items-center gap-3 mb-8 lg:hidden">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style="background: linear-gradient(135deg, #7c3aed, #06b6d4);"
          >
            🌳
          </div>
          <span class="text-lg font-bold" style="color: var(--text-primary);">Skill Tree</span>
        </div>

        <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">欢迎回来</h2>
        <p class="text-sm mb-8" style="color: var(--text-muted);">登录以继续你的学习之旅</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="请输入用户名"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
              @keyup.enter="handleLogin"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
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
            <span v-if="loading">登录中...</span>
            <span v-else>登 录</span>
          </button>
        </div>

        <p class="mt-6 text-center text-sm" style="color: var(--text-muted);">
          没有账号？
          <router-link to="/register" class="font-medium hover:underline" style="color: #8b5cf6;">立即注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
