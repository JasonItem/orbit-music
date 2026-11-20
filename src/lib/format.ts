export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatRemaining(current: number, total: number) {
  const left = Math.max(0, (Number.isFinite(total) ? total : 0) - (Number.isFinite(current) ? current : 0))
  return `-${formatDuration(left)}`
}

export function formatTotalDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins} min`
}
