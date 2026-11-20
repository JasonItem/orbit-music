import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  ChevronDownIcon,
  StarIcon,
  Maximize2Icon,
  Minimize2Icon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  Repeat2Icon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useMediaUrl } from '@/hooks/use-media-url'
import { useSmoothPlaybackClock } from '@/hooks/use-smooth-playback-time'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AmllLyricWords } from '@/components/app/amll-lyric-words'
import type { RepeatMode } from '@/hooks/use-player'
import {
  activeLyricIndex,
  parseLyrics,
  type LyricLine,
  type LyricWord,
} from '@/lib/lyrics'
import { formatDuration } from '@/lib/format'
import { useT } from '@/i18n/react'
import { cn } from '@/lib/utils'
import type { Track } from '@/types/music'

interface NowPlayingLyricsProps {
  track: Track
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  liked?: boolean
  shuffle?: boolean
  repeatMode?: RepeatMode
  /** Controls slide-up enter / slide-down leave. */
  visible?: boolean
  onClose: () => void
  onToggle: () => void
  onSeek: (value: number) => void
  onVolume: (value: number) => void
  onMuteToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onToggleShuffle?: () => void
  onCycleRepeat?: () => void
  onToggleLiked?: () => void
}

function resolveWords(line: LyricLine): LyricWord[] {
  if (line.words?.length) return line.words
  return [{ time: line.time, end: line.time + 1, text: line.text }]
}

/**
 * MyGo timedLines: active line scale 1 / alpha 1, others 0.94 / 0.28;
 * active line words brighten 0.38→1.0 as they are sung.
 */
function LyricLineRow({
  line,
  index,
  isActive,
  timed,
  timeRef,
  onSeek,
}: {
  line: LyricLine
  index: number
  isActive: boolean
  timed: boolean
  timeRef: MutableRefObject<number>
  onSeek: (time: number) => void
}) {
  const words = useMemo(() => resolveWords(line), [line])

  return (
    <div
      id={`lyric-line-${index}`}
      role="button"
      tabIndex={0}
      className={cn(
        'w-full rounded-xl px-3 py-2.5 transition-colors duration-[600ms]',
        'ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:bg-white/[0.08]'
      )}
      onClick={() => {
        if (line.time >= 0) onSeek(line.time)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (line.time >= 0) onSeek(line.time)
        }
      }}
    >
      <div
        className={cn(
          'origin-left flex w-full flex-col items-start gap-1.5 transition-[opacity,transform] duration-[380ms]',
          'ease-[cubic-bezier(0.34,1.2,0.64,1)]',
          isActive
            ? 'scale-100 opacity-100'
            : 'scale-[0.94] opacity-[0.28] hover:opacity-55'
        )}
      >
        {isActive && timed ? (
          <AmllLyricWords
            words={words}
            lineStart={line.time}
            timeRef={timeRef}
            active={isActive}
          />
        ) : (
          <span className="text-white" style={{ letterSpacing: '-0.025em' }}>
            {line.text}
          </span>
        )}
        {line.translation ? (
          <div
            className={cn(
              'text-[17px] font-semibold',
              isActive ? 'text-white/70' : 'text-white/70'
            )}
          >
            {line.translation}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function NowPlayingLyrics({
  track,
  playing,
  currentTime,
  duration,
  volume,
  muted,
  liked = false,
  shuffle = false,
  repeatMode = 'off',
  visible = true,
  onClose,
  onToggle,
  onSeek,
  onVolume,
  onMuteToggle,
  onPrevious,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLiked,
}: NowPlayingLyricsProps) {
  const t = useT()
  const [lrc, setLrc] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [playerHeight, setPlayerHeight] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const playerStackRef = useRef<HTMLDivElement | null>(null)
  const coverUrl = useMediaUrl(track.cover_path || track.folder_cover_path)
  const { timeRef, tick } = useSmoothPlaybackClock(
    currentTime,
    playing,
    track.id
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        if (window.musicApp?.getLyrics) {
          const result = await window.musicApp.getLyrics(track.id)
          if (!cancelled) setLrc(result.lrc || track.lyrics_text || '')
        } else if (!cancelled) {
          setLrc(track.lyrics_text || '')
        }
      } catch {
        if (!cancelled) setLrc(track.lyrics_text || '')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [track])

  const lines = useMemo(() => parseLyrics(lrc), [lrc])
  const hasLyrics = lines.length > 0
  const timed = lines.some((line) => line.time >= 0)
  const active = timed ? activeLyricIndex(lines, timeRef.current) : -1
  void tick

  const total = duration || track.duration || 0

  useEffect(() => {
    const el = playerStackRef.current
    if (!el) return
    const update = () => setPlayerHeight(el.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasLyrics, coverUrl, track.id, lrc])

  // YesPlayMusic: scroll active line to center when index changes
  useEffect(() => {
    if (active < 0) return
    const el = document.getElementById(`lyric-line-${active}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, track.id])

  useEffect(() => {
    let cancelled = false
    void window.musicApp?.windowIsFullscreen?.().then((value) => {
      if (!cancelled) setFullscreen(Boolean(value))
    })
    const unsubscribe = window.musicApp?.onFullscreenChanged?.((value) => {
      setFullscreen(value)
    })
    const onDomFullscreen = () => {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onDomFullscreen)
    return () => {
      cancelled = true
      unsubscribe?.()
      document.removeEventListener('fullscreenchange', onDomFullscreen)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (fullscreen) {
        void window.musicApp?.windowToggleFullscreen?.().then((value) => {
          setFullscreen(Boolean(value))
        })
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, onClose])

  async function toggleFullscreen() {
    const api = window.musicApp
    if (api?.windowToggleFullscreen) {
      const next = await api.windowToggleFullscreen()
      setFullscreen(Boolean(next))
      return
    }
    // Browser fallback (e.g. Vite-only preview)
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      await document.exitFullscreen()
      setFullscreen(false)
    }
  }

  return (
    <div
      className={cn(
        'lyrics-page fixed inset-0 z-[100] flex overflow-hidden bg-[#0b0b0c] text-white',
        'transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {/* Dynamic rotating blurred cover — YesPlayMusic lyrics-background */}
      <div className="lyrics-background pointer-events-none absolute inset-0">
        {coverUrl ? (
          <div className="dynamic-background absolute inset-0">
            <div
              className="top-right"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
            <div
              className="bottom-left"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Drag strip (window chrome hidden on this page) */}
      <div className="app-drag absolute inset-x-0 top-0 z-[95] h-10" />

      <div className="app-no-drag absolute top-3 right-3 z-[96] flex items-center gap-1">
        <button
          type="button"
          aria-label={
            fullscreen
              ? t('player.exitFullscreen')
              : t('player.enterFullscreen')
          }
          className="lyrics-media-btn flex size-11 items-center justify-center text-white/30 hover:text-white/90"
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? (
            <Minimize2Icon className="size-5" />
          ) : (
            <Maximize2Icon className="size-5" />
          )}
        </button>
        <button
          type="button"
          aria-label={t('player.closeLyrics')}
          className="lyrics-media-btn flex size-11 items-center justify-center text-white/30 hover:text-white/90"
          onClick={onClose}
        >
          <ChevronDownIcon className="size-6" />
        </button>
      </div>

      {/* Centered player + lyrics group (matches reference layout) */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-[clamp(1.5rem,6vw,5rem)]">
        <div
          className={cn(
            'flex w-fit max-w-full items-start',
            hasLyrics && 'gap-[clamp(2rem,5vw,4.5rem)]'
          )}
        >
          <div
            ref={playerStackRef}
            className="lyrics-player-stack flex w-[clamp(240px,34vh,420px)] shrink-0 flex-col"
          >
            <div className="relative w-full">
              {coverUrl ? (
                <>
                  <div
                    className="cover-shadow absolute top-2 -z-10 aspect-square w-full rounded-[0.75em] bg-cover"
                    style={{ backgroundImage: `url(${coverUrl})` }}
                  />
                  <img
                    src={coverUrl}
                    alt={track.title}
                    className="relative aspect-square w-full rounded-[0.75em] object-cover select-none"
                    draggable={false}
                  />
                </>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[0.75em] bg-white/10 text-white/40">
                  Orbit Music
                </div>
              )}
            </div>

            <div className="mt-5 w-full text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold opacity-90">
                    {track.title}
                  </div>
                  <div className="mt-1 truncate text-sm opacity-60">
                    {track.artist || t('common.unknownArtist')}
                    {track.album ? ` - ${track.album}` : ''}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lyrics-media-btn shrink-0 text-white/70 hover:text-white"
                  aria-label={liked ? t('player.unlike') : t('player.like')}
                  disabled={!onToggleLiked}
                  onClick={() => onToggleLiked?.()}
                >
                  <StarIcon
                    className={cn(
                      'size-5',
                      liked && 'fill-current'
                    )}
                  />
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="min-w-7 text-xs opacity-60 tabular-nums">
                  {formatDuration(currentTime)}
                </span>
                <Slider
                  value={[Math.min(currentTime, total || 0)]}
                  max={Math.max(total, 1)}
                  step={0.1}
                  onValueChange={(value) => onSeek(value[0] ?? 0)}
                  aria-label={t('player.progress')}
                  className="flex-1"
                />
                <span className="min-w-7 text-xs opacity-60 tabular-nums">
                  {formatDuration(total)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  className={cn(
                    'lyrics-media-btn relative flex size-9 items-center justify-center text-white/45',
                    shuffle && 'text-white'
                  )}
                  aria-label={
                    shuffle
                      ? t('player.shuffleTooltipOn')
                      : t('player.shuffleTooltipOff')
                  }
                  aria-pressed={shuffle}
                  title={
                    shuffle
                      ? t('player.shuffleTooltipOn')
                      : t('player.shuffleTooltipOff')
                  }
                  onClick={() => onToggleShuffle?.()}
                >
                  <ShuffleIcon className="size-4 stroke-[2.25]" />
                  {shuffle ? (
                    <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white" />
                  ) : null}
                </button>
                <button
                  type="button"
                  className="lyrics-media-btn flex size-10 items-center justify-center text-white"
                  aria-label={t('player.previous')}
                  onClick={onPrevious}
                >
                  <SkipBackIcon className="size-5 fill-current" />
                </button>
                <button
                  type="button"
                  className="lyrics-media-btn flex size-12 items-center justify-center text-white"
                  aria-label={playing ? t('common.pause') : t('common.play')}
                  onClick={onToggle}
                >
                  {playing ? (
                    <PauseIcon className="size-8 fill-current" />
                  ) : (
                    <PlayIcon className="size-8 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  className="lyrics-media-btn flex size-10 items-center justify-center text-white"
                  aria-label={t('player.next')}
                  onClick={onNext}
                >
                  <SkipForwardIcon className="size-5 fill-current" />
                </button>
                <button
                  type="button"
                  className={cn(
                    'lyrics-media-btn relative flex size-9 items-center justify-center text-white/45',
                    repeatMode !== 'off' && 'text-white'
                  )}
                  aria-label={
                    repeatMode === 'one'
                      ? t('player.repeatTooltipOne')
                      : repeatMode === 'all'
                        ? t('player.repeatTooltipAll')
                        : t('player.repeatTooltipOff')
                  }
                  aria-pressed={repeatMode !== 'off'}
                  title={
                    repeatMode === 'one'
                      ? t('player.repeatTooltipOne')
                      : repeatMode === 'all'
                        ? t('player.repeatTooltipAll')
                        : t('player.repeatTooltipOff')
                  }
                  onClick={() => onCycleRepeat?.()}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1Icon className="size-4 stroke-[2.25]" />
                  ) : (
                    <Repeat2Icon className="size-4 stroke-[2.25]" />
                  )}
                  {repeatMode !== 'off' ? (
                    <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white" />
                  ) : null}
                </button>
              </div>

              <div className="mt-4 flex w-full items-center gap-3">
                <button
                  type="button"
                  className="flex size-4 shrink-0 items-center justify-center text-white/85 hover:text-white"
                  aria-label={
                    muted || volume === 0
                      ? t('player.unmute')
                      : t('player.mute')
                  }
                  onClick={onMuteToggle}
                >
                  {muted || volume === 0 ? (
                    <VolumeXIcon className="size-4" />
                  ) : (
                    <Volume2Icon className="size-4" />
                  )}
                </button>
                <Slider
                  value={[muted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => onVolume(value[0] ?? 0)}
                  aria-label={t('player.volume')}
                  className="min-w-0 flex-1"
                />
              </div>
            </div>
          </div>

          {hasLyrics ? (
            <div
              className="relative min-w-0 shrink-0 overflow-hidden"
              style={{
                width: 'clamp(280px, 34vw, 520px)',
                height: playerHeight ?? undefined,
              }}
            >
              <div
                ref={listRef}
                className="lyrics-ypm-scroll h-full overflow-y-auto text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.35] font-bold"
              >
                {lines.map((line, index) => (
                  <LyricLineRow
                    key={`${line.time}-${index}`}
                    line={line}
                    index={index}
                    isActive={timed ? index === active : false}
                    timed={timed}
                    timeRef={timeRef}
                    onSeek={onSeek}
                  />
                ))}
                <div className="h-24 shrink-0" aria-hidden />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
