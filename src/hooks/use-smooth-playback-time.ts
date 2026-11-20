import { useEffect, useRef, useState } from 'react'

/**
 * Keep a high-frequency playback clock in a ref (for karaoke paint),
 * and only re-render React when the active lyric line may change.
 */
export function useSmoothPlaybackClock(
  currentTime: number,
  playing: boolean,
  trackKey?: string | number | null,
  onFrame?: (time: number) => void
) {
  const timeRef = useRef(currentTime)
  const anchorRef = useRef({ time: currentTime, at: performance.now() })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    anchorRef.current = { time: currentTime, at: performance.now() }
    timeRef.current = currentTime
    if (!playing) {
      onFrame?.(currentTime)
      setTick((value) => value + 1)
    }
  }, [currentTime, playing, onFrame])

  useEffect(() => {
    anchorRef.current = { time: currentTime, at: performance.now() }
    timeRef.current = currentTime
    onFrame?.(currentTime)
    setTick((value) => value + 1)
  }, [trackKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return

    let raf = 0
    let lastEmit = 0
    const tickFrame = (now: number) => {
      const { time, at } = anchorRef.current
      const estimated = time + (now - at) / 1000
      timeRef.current = estimated
      onFrame?.(estimated)
      // Soft UI refresh ~10fps for line switching; karaoke fill paints via refs.
      if (now - lastEmit > 100) {
        lastEmit = now
        setTick((value) => value + 1)
      }
      raf = requestAnimationFrame(tickFrame)
    }
    raf = requestAnimationFrame(tickFrame)
    return () => cancelAnimationFrame(raf)
  }, [playing, trackKey, onFrame])

  return { timeRef, tick }
}
