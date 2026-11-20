import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  getLocalePreference,
  getResolvedLocale,
  setLocalePreference,
  subscribeLocale,
  t as translate,
  type AppLocale,
  type MessageKey,
  type ResolvedLocale,
  type TranslateParams,
} from '@/i18n'

interface I18nContextValue {
  locale: AppLocale
  resolved: ResolvedLocale
  setLocale: (next: AppLocale) => void
  t: (key: MessageKey, params?: TranslateParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function useLocaleStore() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocalePreference,
    getLocalePreference
  )
  const resolved = useSyncExternalStore(
    subscribeLocale,
    getResolvedLocale,
    getResolvedLocale
  )
  return { locale, resolved }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale, resolved } = useLocaleStore()

  const setLocale = useCallback((next: AppLocale) => {
    setLocalePreference(next)
  }, [])

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translate(key, params),
    // Re-bind when locale changes so consumers always get fresh strings
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved]
  )

  const value = useMemo(
    () => ({ locale, resolved, setLocale, t }),
    [locale, resolved, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}

export function useT() {
  return useI18n().t
}
