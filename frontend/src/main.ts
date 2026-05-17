import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedState from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPersistedState)

app.use(pinia)
app.use(ElementPlus)
app.use(router)

import { useThemeStore } from './stores/theme'
const themeStore = useThemeStore()
themeStore.init()

import { useLocaleStore } from './stores/locale'
const localeStore = useLocaleStore()
localeStore.init()

app.mount('#app')
