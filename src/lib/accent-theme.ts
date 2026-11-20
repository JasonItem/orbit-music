/** Default brand accent (legacy red). */
export const DEFAULT_ACCENT_COLOR = '#ef4444'

/** Quick presets shown inside the color picker panel. */
export const ACCENT_PRESETS = [
  '#ef4444',
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
] as const

const STORAGE_KEY = 'bound-music.accent-color'
const LEGACY_KEY = 'bound-music.accent'

const LEGACY_PRESETS: Record<string, string> = {
  red: '#ef4444',
  rose: '#f43f5e',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
}

function normalizeHex(value: string): string | null {
  const raw = value.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(raw)
  if (short?.[1]) {
    const [r, g, b] = short[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const full = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(raw)
  if (full?.[1]) return `#${full[1].toLowerCase()}`
  return null
}

/** Simple WCAG-ish foreground pick for boot / non-React paths. */
export function pickBrandForeground(background: string): string {
  const hex = normalizeHex(background)
  if (!hex) return '#ffffff'
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
  return L > 0.45 ? '#0a0a0a' : '#ffffff'
}

export function readStoredAccentColor(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const normalized = normalizeHex(raw)
      if (normalized) return normalized
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy && LEGACY_PRESETS[legacy]) {
      const migrated = LEGACY_PRESETS[legacy]!
      localStorage.setItem(STORAGE_KEY, migrated)
      return migrated
    }
  } catch {
    // ignore
  }
  return DEFAULT_ACCENT_COLOR
}

export function applyAccentColor(color: string) {
  const normalized = normalizeHex(color) ?? DEFAULT_ACCENT_COLOR
  const root = document.documentElement
  root.style.setProperty('--brand', normalized)
  root.style.setProperty('--brand-foreground', pickBrandForeground(normalized))
  delete root.dataset.accent
  return normalized
}

export function persistAccentColor(color: string) {
  const normalized = applyAccentColor(color)
  try {
    localStorage.setItem(STORAGE_KEY, normalized)
  } catch {
    // ignore
  }
  return normalized
}
