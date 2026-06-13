import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserInfo } from '../api/auth'
import { userApi } from '../api/user'

function getAuthErrorMessage(err: unknown, fallback: string) {
  const axiosError = err as { response?: { data?: { message?: string | string[] } }; message?: string }
  const message = axiosError.response?.data?.message ?? axiosError.message
  return Array.isArray(message) ? message.join('；') : message || fallback
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref<string | null>(null)
    const user = ref<UserInfo | null>(null)

    const isAuthenticated = computed(() => !!token.value)

    async function loginAction(username: string, password: string) {
      try {
        const res = await authApi.login(username, password)
        if (!res.success || !res.data) throw new Error(res.message)
        token.value = res.data.access_token
        user.value = res.data.user
      } catch (err) {
        throw new Error(getAuthErrorMessage(err, '登录失败'))
      }
    }

    async function registerAction(username: string, password: string, name: string) {
      try {
        const res = await authApi.register(username, password, name)
        if (!res.success) throw new Error(res.message)
      } catch (err) {
        throw new Error(getAuthErrorMessage(err, '注册失败'))
      }
    }

    async function validateSession() {
      if (!token.value) return false
      try {
        const res = await userApi.getProfile()
        if (!res.success || !res.data) throw new Error(res.message)
        user.value = res.data
        return true
      } catch {
        logout()
        return false
      }
    }

    function updateUser(partial: Partial<UserInfo>) {
      if (user.value) Object.assign(user.value, partial)
    }

    function logout() {
      token.value = null
      user.value = null
    }

    return { token, user, isAuthenticated, loginAction, registerAction, validateSession, updateUser, logout }
  },
  {
    persist: {
      key: 'auth',
      storage: localStorage,
      pick: ['token', 'user'],
    },
  },
)
