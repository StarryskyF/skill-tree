import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserInfo } from '../api/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref<string | null>(null)
    const user = ref<UserInfo | null>(null)

    const isAuthenticated = computed(() => !!token.value)

    async function loginAction(username: string, password: string) {
      const res = await authApi.login(username, password)
      if (!res.success || !res.data) throw new Error(res.message)
      token.value = res.data.access_token
      user.value = res.data.user
    }

    async function registerAction(username: string, password: string, name: string) {
      const res = await authApi.register(username, password, name)
      if (!res.success) throw new Error(res.message)
    }

    function updateUser(partial: Partial<UserInfo>) {
      if (user.value) Object.assign(user.value, partial)
    }

    function logout() {
      token.value = null
      user.value = null
    }

    return { token, user, isAuthenticated, loginAction, registerAction, updateUser, logout }
  },
  {
    persist: {
      key: 'auth',
      storage: localStorage,
      pick: ['token', 'user'],
    },
  },
)
