import { useEffect, useRef, type MutableRefObject } from 'react'
import type { LyricWord } from '@/lib/lyrics'

/**
 * MyGo Music timed-lyrics word highlight (egoist/mygo-music timedLines):
 *
 *   lit = clamp01((pos - word.Start) / max(0.05, word.End - word.Start))
 *   color = white.Alpha(0.38 + 0.62 * lit)
 *
 * Continuous per-word brightening while sung — no scale, no mask plate, no float.
 * Refreshed every animation frame (MyGo uses ~25fps / 40ms while playing).
 */

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export function AmllLyricWords({
  words,
  timeRef,
  active,
}: {
  words: LyricWord[]
  lineStart?: number
  timeRef: MutableRefObject<number>
  active: boolean
}) {
  const rootRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !active) return
    const spans = [...root.querySelectorAll<HTMLElement>('[data-mygo-word]')]
    if (!spans.length) return

    let raf = 0
    const paint = () => {
      const t = timeRef.current
      words.forEach((word, index) => {
        const span = spans[index]
        if (!span) return
        const spanDur = Math.max(0.05, word.end - word.time)
        const lit = clamp01((t - word.time) / spanDur)
        // MyGo: white.Alpha(0.38 + 0.62*lit)
        span.style.color = `rgba(255,255,255,${0.38 + 0.62 * lit})`
      })
      raf = requestAnimationFrame(paint)
    }

    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [active, words, timeRef])

  return (
    <span
      ref={rootRef}
      className="whitespace-pre-wrap"
      style={{ letterSpacing: '-0.025em' }}
    >
      {words.map((word, index) => (
        <span
          key={`${word.time}-${index}`}
          data-mygo-word
          style={{ color: 'rgba(255,255,255,0.38)' }}
        >
          {word.text}
        </span>
      ))}
    </span>
  )
}
