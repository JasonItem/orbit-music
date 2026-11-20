import { useCallback, useSyncExternalStore } from 'react'
import {
  applyAccentColor,
  persistAccentColor,
  readStoredAccentColor,
} from '@/lib/accent-theme'

type Listener = () => void

let current = '#ef4444'
const listeners = new Set<Listener>()

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return current
}

function notify() {
  for (const listener of listeners) listener()
}

export function useAccent() {
  const accent = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  /** Live preview while dragging the picker. */
  const previewAccent = useCallback((next: string) => {
    current = applyAccentColor(next)
    notify()
  }, [])

  /** Persist after commit (drag end / swatch / typed value). */
  const setAccent = useCallback((next: string) => {
    current = persistAccentColor(next)
    notify()
  }, [])

  return { accent, previewAccent, setAccent }
}

export function bootAccent() {
  current = persistAccentColor(readStoredAccentColor())
}
