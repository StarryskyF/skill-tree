import { computed } from 'vue'
import { useLocaleStore, type AppLocale } from '../stores/locale'
import zhCN from './zh-CN'
import enUS from './en-US'

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
} as const

interface MessageTree {
  [key: string]: string | MessageTree
}
type Params = Record<string, string | number>

function resolveMessage(tree: MessageTree, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, tree)

  return typeof value === 'string' ? value : key
}

function formatMessage(template: string, params?: Params) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

export function useI18n() {
  const localeStore = useLocaleStore()
  const locale = computed(() => localeStore.locale)

  function t(key: string, params?: Params) {
    return formatMessage(resolveMessage(messages[locale.value], key), params)
  }

  function setLocale(nextLocale: AppLocale) {
    localeStore.setLocale(nextLocale)
  }

  return { locale, t, setLocale, toggleLocale: localeStore.toggle }
}
