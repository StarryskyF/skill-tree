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
const name = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!username.value || !password.value || !name.value) return
  loading.value = true
  try {
    await auth.registerAction(username.value, password.value, name.value)
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (err: any) {
    ElMessage.error(err.message || '注册失败')
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
      style="background: linear-gradient(135deg, #0a1628 0%, #0f0f1a 50%, #1a0533 100%);"
    >
      <!-- Decorative node grid -->
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
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            style="background: linear-gradient(135deg, #06b6d4, #7c3aed);"
          >
            🚀
          </div>
        </div>
        <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">开启旅程</h1>
        <p class="text-lg mb-8" style="color: #22d3ee;">从这里迈出第一步</p>

        <div class="space-y-4 text-left">
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">🗺️</span>
            <div>
              <p class="text-white font-medium text-sm">专属学习路径</p>
              <p class="text-xs" style="color: #64748b;">AI 为你量身定制技能地图</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">🏆</span>
            <div>
              <p class="text-white font-medium text-sm">成就与徽章</p>
              <p class="text-xs" style="color: #64748b;">每次突破都值得庆祝</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">💬</span>
            <div>
              <p class="text-white font-medium text-sm">AI 实时答疑</p>
              <p class="text-xs" style="color: #64748b;">遇到问题随时获得帮助</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Register Form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div
        class="w-full max-w-md rounded-2xl p-8"
        style="background-color: var(--bg-card); box-shadow: var(--shadow-card); border: 1px solid var(--border-color);"
      >
        <!-- Mobile logo -->
        <div class="flex items-center gap-3 mb-8 lg:hidden">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style="background: linear-gradient(135deg, #06b6d4, #7c3aed);"
          >
            🚀
          </div>
          <span class="text-lg font-bold" style="color: var(--text-primary);">Skill Tree</span>
        </div>

        <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">创建账号</h2>
        <p class="text-sm mb-8" style="color: var(--text-muted);">免费注册，立即开始学习</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">昵称</label>
            <input
              v-model="name"
              type="text"
              placeholder="你希望被如何称呼"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="用于登录的唯一标识"
              class="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
              style="background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary);"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary);">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="至少 6 位"
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
            <span v-if="loading">注册中...</span>
            <span v-else>注 册</span>
          </button>
        </div>

        <p class="mt-6 text-center text-sm" style="color: var(--text-muted);">
          已有账号？
          <router-link to="/login" class="font-medium hover:underline" style="color: #8b5cf6;">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
