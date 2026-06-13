import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedState from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'
import { useAuthStore } from './stores/auth'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  pinia.use(piniaPersistedState)

  app.use(pinia)
  app.use(ElementPlus)
  app.use(router)

  const themeStore = useThemeStore()
  themeStore.init()

  const localeStore = useLocaleStore()
  localeStore.init()

  const authStore = useAuthStore()
  await authStore.validateSession()

  app.mount('#app')
}

void bootstrap()
