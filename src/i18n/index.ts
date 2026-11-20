import {
  catalogs,
  type MessageKey,
  type ResolvedLocale,
} from '@/i18n/messages'

export type AppLocale = 'system' | ResolvedLocale

export type { MessageKey, ResolvedLocale }

const STORAGE_KEY = 'bound-music.locale'

type Listener = () => void

let preference: AppLocale = 'system'
let resolved: ResolvedLocale = 'zh-CN'
const listeners = new Set<Listener>()

function detectSystemLocale(): ResolvedLocale {
  try {
    const nav = navigator.language.toLowerCase()
    if (nav.startsWith('zh')) return 'zh-CN'
  } catch {
    // ignore
  }
  return 'en'
}

export function resolveLocale(locale: AppLocale): ResolvedLocale {
  return locale === 'system' ? detectSystemLocale() : locale
}

function readStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'system' || raw === 'zh-CN' || raw === 'en') return raw
  } catch {
    // ignore
  }
  return 'system'
}

function applyDocumentLang(next: ResolvedLocale) {
  document.documentElement.lang = next
}

function notify() {
  for (const listener of listeners) listener()
}

export function getLocalePreference(): AppLocale {
  return preference
}

export function getResolvedLocale(): ResolvedLocale {
  return resolved
}

export function subscribeLocale(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initLocale() {
  preference = readStoredLocale()
  resolved = resolveLocale(preference)
  applyDocumentLang(resolved)
}

export function setLocalePreference(next: AppLocale) {
  preference = next
  resolved = resolveLocale(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // ignore
  }
  applyDocumentLang(resolved)
  notify()
}

export type TranslateParams = Record<string, string | number>

export function t(key: MessageKey, params?: TranslateParams): string {
  const table = catalogs[resolved] ?? catalogs['zh-CN']
  let text = table[key] ?? catalogs['zh-CN'][key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

/** Liked playlist is stored in Chinese in SQLite; always localize for UI. */
export function playlistDisplayName(
  playlist: { kind: string; name: string },
  translate: typeof t = t
): string {
  return playlist.kind === 'liked' ? translate('nav.liked') : playlist.name
}

export function playlistDisplayDescription(
  playlist: { kind: string; description?: string | null },
  translate: typeof t = t
): string {
  if (playlist.kind === 'liked') return translate('playlist.likedDescription')
  return playlist.description ?? ''
}

initLocale()
