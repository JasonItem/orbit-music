import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n'
import { isPluginTrack, type Track } from '@/types/music'

export type RepeatMode = 'off' | 'all' | 'one'

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

function dedupeAppend(queue: Track[], incoming: Track[]): Track[] {
  const seen = new Set(queue.map((t) => t.id))
  const next = [...queue]
  for (const track of incoming) {
    if (seen.has(track.id)) continue
    seen.add(track.id)
    next.push(track)
  }
  return next
}

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<Track[]>([])
  const currentRef = useRef<Track | null>(null)
  const repeatRef = useRef<RepeatMode>('all')
  const shuffleRef = useRef(false)
  const orderRef = useRef<Track[]>([])

  const [queue, setQueueState] = useState<Track[]>([])
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.85)
  const [muted, setMuted] = useState(false)
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('all')
  const [shuffle, setShuffleState] = useState(false)

  const setQueue = useCallback((next: Track[] | ((prev: Track[]) => Track[])) => {
    setQueueState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      queueRef.current = resolved
      return resolved
    })
  }, [])

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useEffect(() => {
    repeatRef.current = repeatMode
  }, [repeatMode])

  useEffect(() => {
    shuffleRef.current = shuffle
  }, [shuffle])

  const loadAndPlay = useCallback(async (track: Track) => {
    if (!window.musicApp || !audioRef.current) return
    if (track.missing) {
      toast.error(t('player.fileMissing'))
      setPlaying(false)
      return
    }

    let url: string | null = null
    if (isPluginTrack(track)) {
      if (!window.musicApp.plugins?.getPlayUrl) {
        toast.error(t('plugins.unavailable'))
        setPlaying(false)
        return
      }
      try {
        const play = await window.musicApp.plugins.getPlayUrl({
          pluginId: track.pluginId,
          sourceId: track.sourceId,
          path: track.path,
        })
        url = play?.url || null
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('player.playFailed')
        )
        setPlaying(false)
        return
      }
    } else {
      url = await window.musicApp.mediaUrl(track.path)
    }

    if (!url) {
      toast.error(t('player.playFailed'))
      setPlaying(false)
      return
    }

    const audio = audioRef.current
    audio.src = url
    setCurrent(track)
    currentRef.current = track
    setCurrentTime(0)
    try {
      await audio.play()
      if (!isPluginTrack(track) && track.id > 0) {
        void window.musicApp.bumpPlay(track.id)
      }
    } catch (error) {
      const ext = isPluginTrack(track)
        ? 'ONLINE'
        : track.path.split('.').pop()?.toUpperCase() ||
          t('player.audioFallback')
      toast.error(
        error instanceof DOMException && error.name === 'NotSupportedError'
          ? t('player.unsupportedFormat', { ext })
          : error instanceof Error
            ? error.message
            : t('player.playFailed')
      )
      setPlaying(false)
    }
  }, [])

  const pickNext = useCallback(
    (from: Track, direction: 1 | -1): Track | null => {
      const list = queueRef.current
      if (!list.length) return null
      const index = list.findIndex((t) => t.id === from.id)
      if (index < 0) return list.find((t) => !t.missing) ?? null

      if (direction === 1 && repeatRef.current === 'one') {
        return from.missing ? null : from
      }

      const step = direction
      for (let offset = 1; offset <= list.length; offset += 1) {
        let nextIndex = index + step * offset
        if (repeatRef.current === 'all') {
          nextIndex = ((nextIndex % list.length) + list.length) % list.length
        } else if (nextIndex < 0 || nextIndex >= list.length) {
          return null
        }
        const candidate = list[nextIndex]
        if (candidate && !candidate.missing) return candidate
        if (repeatRef.current !== 'all') continue
      }
      return null
    },
    []
  )

  const playNextInternal = useCallback(async () => {
    const cur = currentRef.current
    if (!cur) return
    if (repeatRef.current === 'one') {
      await loadAndPlay(cur)
      return
    }
    const next = pickNext(cur, 1)
    if (next) await loadAndPlay(next)
  }, [loadAndPlay, pickNext])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      setPlaying(false)
      void playNextInternal()
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      setPlaying(false)
      const code = audio.error?.code
      if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        toast.error(t('player.decodeFailed'))
      } else if (code === MediaError.MEDIA_ERR_NETWORK) {
        toast.error(t('player.loadFailed'))
      } else if (audio.error) {
        toast.error(t('player.playFailed'))
      }
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [playNextInternal])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume
    }
  }, [volume, muted])

  /** Play a track; replace queue with the source list (整表进入播放列表). */
  const playTrack = useCallback(
    async (track: Track, nextQueue?: Track[]) => {
      if (nextQueue) {
        const list = [...nextQueue]
        orderRef.current = list
        const ordered = shuffleRef.current
          ? [
              track,
              ...shuffleArray(list.filter((t) => t.id !== track.id)),
            ]
          : list
        setQueue(ordered)
      }
      if (track.missing) {
        toast.error(t('player.fileMissing'))
        const playable = (nextQueue || queueRef.current).find((item) => !item.missing)
        if (playable) await loadAndPlay(playable)
        return
      }
      await loadAndPlay(track)
    },
    [loadAndPlay, setQueue]
  )

  const addToQueue = useCallback(
    (tracks: Track | Track[]) => {
      const incoming = (Array.isArray(tracks) ? tracks : [tracks]).filter(
        (t) => !t.missing
      )
      if (!incoming.length) {
        toast.error(t('player.tracksUnavailable'))
        return 0
      }
      const prev = queueRef.current
      const next = dedupeAppend(prev, incoming)
      const added = next.length - prev.length
      setQueue(next)
      orderRef.current = dedupeAppend(orderRef.current, incoming)
      if (added > 0) toast.success(t('player.addedToQueue', { count: added }))
      else toast.message(t('player.alreadyInQueue'))
      return added
    },
    [setQueue]
  )

  const removeFromQueue = useCallback(
    (trackId: number) => {
      const wasCurrent = currentRef.current?.id === trackId
      const list = queueRef.current
      const index = list.findIndex((t) => t.id === trackId)
      setQueue((prev) => prev.filter((t) => t.id !== trackId))
      orderRef.current = orderRef.current.filter((t) => t.id !== trackId)
      if (!wasCurrent || !audioRef.current) return
      // Jump to next remaining track, or stop if queue emptied
      const remaining = list.filter((t) => t.id !== trackId)
      if (!remaining.length) {
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
        setCurrent(null)
        currentRef.current = null
        setPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        return
      }
      const next =
        remaining[Math.min(Math.max(index, 0), remaining.length - 1)] ??
        remaining[0]
      if (next) void loadAndPlay(next)
    },
    [loadAndPlay, setQueue]
  )

  const clearQueue = useCallback(() => {
    const cur = currentRef.current
    if (cur) {
      setQueue([cur])
      orderRef.current = [cur]
    } else {
      setQueue([])
      orderRef.current = []
    }
  }, [setQueue])

  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentRef.current) return
    if (audio.paused) await audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }, [])

  const setVolume = useCallback((value: number) => {
    setVolumeState(value)
    setMuted(value === 0)
  }, [])

  const playPrevious = useCallback(async () => {
    const cur = currentRef.current
    if (!cur) return
    if (currentTime > 3) {
      seek(0)
      return
    }
    const prev = pickNext(cur, -1)
    if (prev) await loadAndPlay(prev)
    else seek(0)
  }, [currentTime, loadAndPlay, pickNext, seek])

  const playNext = useCallback(async () => {
    const cur = currentRef.current
    if (!cur) return
    // Manual next always advances (even in repeat-one)
    const list = queueRef.current
    const index = list.findIndex((t) => t.id === cur.id)
    let found: Track | null = null
    for (let i = 1; i <= list.length; i += 1) {
      const candidate = list[(index + i + list.length) % list.length]
      if (!candidate || candidate.missing) continue
      if (candidate.id === cur.id && list.length > 1) continue
      found = candidate
      break
    }
    if (found) await loadAndPlay(found)
  }, [loadAndPlay])

  const cycleRepeatMode = useCallback(() => {
    setRepeatModeState((prev) => {
      const next: RepeatMode =
        prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
      repeatRef.current = next
      return next
    })
  }, [])

  const toggleShuffle = useCallback(() => {
    const next = !shuffleRef.current
    shuffleRef.current = next
    setShuffleState(next)

    const cur = currentRef.current
    const base =
      orderRef.current.length > 0 ? orderRef.current : [...queueRef.current]
    if (!base.length) return

    if (next) {
      // Keep current track playing; shuffle the rest of the source order.
      const rest = base.filter((t) => t.id !== cur?.id)
      setQueue(cur ? [cur, ...shuffleArray(rest)] : shuffleArray(base))
      return
    }

    // Restore original source order (current track stays where it is in that order).
    if (!cur) {
      setQueue([...base])
      return
    }
    const idx = base.findIndex((t) => t.id === cur.id)
    setQueue(idx >= 0 ? [...base] : [cur, ...base.filter((t) => t.id !== cur.id)])
  }, [setQueue])

  return {
    current,
    queue,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    repeatMode,
    shuffle,
    playTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    toggle,
    seek,
    setVolume,
    setMuted,
    playPrevious,
    playNext,
    setQueue,
    cycleRepeatMode,
    toggleShuffle,
  }
}
