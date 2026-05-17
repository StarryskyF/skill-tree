import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppLocale = 'zh-CN' | 'en-US'

const STORAGE_KEY = 'locale'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<AppLocale>('zh-CN')

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh-CN' || saved === 'en-US') {
      locale.value = saved
      return
    }

    locale.value = navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
    localStorage.setItem(STORAGE_KEY, locale.value)
  }

  function setLocale(nextLocale: AppLocale) {
    locale.value = nextLocale
    localStorage.setItem(STORAGE_KEY, nextLocale)
  }

  function toggle() {
    setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return { locale, init, setLocale, toggle }
})
