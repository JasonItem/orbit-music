import { useEffect, useState } from 'react'
import {
  ChevronUpIcon,
  StarIcon,
  ListMusicIcon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  Repeat2Icon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume1Icon,
  VolumeXIcon,
} from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { NowPlayingLyrics } from '@/components/app/now-playing-lyrics'
import { PlayQueuePanel } from '@/components/app/play-queue-panel'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RepeatMode } from '@/hooks/use-player'
import { accentForName } from '@/lib/library-groups'
import { formatDuration, formatRemaining } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/react'
import type { Track } from '@/types/music'

interface PlayerBarProps {
  current: Track | null
  queue: Track[]
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeatMode: RepeatMode
  liked?: boolean
  onToggle: () => void
  onSeek: (value: number) => void
  onVolume: (value: number) => void
  onMuteToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onToggleShuffle: () => void
  onCycleRepeat: () => void
  onPlayFromQueue: (track: Track) => void
  onRemoveFromQueue: (trackId: number) => void
  onClearQueue: () => void
  onToggleLiked?: () => void
  onLyricsOpenChange?: (open: boolean) => void
}

const LYRICS_SLIDE_MS = 380

export function PlayerBar({
  current,
  queue,
  playing,
  currentTime,
  duration,
  volume,
  muted,
  shuffle,
  repeatMode,
  liked = false,
  onToggle,
  onSeek,
  onVolume,
  onMuteToggle,
  onPrevious,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
  onToggleLiked,
  onLyricsOpenChange,
}: PlayerBarProps) {
  const t = useT()
  const [queueOpen, setQueueOpen] = useState(false)
  const [lyricsMounted, setLyricsMounted] = useState(false)
  const [lyricsShown, setLyricsShown] = useState(false)
  const shuffleTooltip = shuffle
    ? t('player.shuffleTooltipOn')
    : t('player.shuffleTooltipOff')
  const repeatTooltip =
    repeatMode === 'one'
      ? t('player.repeatTooltipOne')
      : repeatMode === 'all'
        ? t('player.repeatTooltipAll')
        : t('player.repeatTooltipOff')

  const total = duration || current?.duration || 0
  const accent = current
    ? accentForName(current.album || current.title)
    : undefined

  const openLyrics = () => {
    if (!current) return
    setLyricsMounted(true)
  }

  const closeLyrics = () => {
    setLyricsShown(false)
  }

  useEffect(() => {
    if (!lyricsMounted) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLyricsShown(true))
    })
    return () => cancelAnimationFrame(id)
  }, [lyricsMounted])

  useEffect(() => {
    if (lyricsMounted && !lyricsShown) {
      const timer = window.setTimeout(() => {
        setLyricsMounted(false)
      }, LYRICS_SLIDE_MS)
      return () => window.clearTimeout(timer)
    }
  }, [lyricsMounted, lyricsShown])

  useEffect(() => {
    // Drive chrome visibility off the slide, not mount, so the shell header
    // can fade with the overlay instead of popping after unmount.
    onLyricsOpenChange?.(lyricsMounted && lyricsShown)
  }, [lyricsMounted, lyricsShown, onLyricsOpenChange])

  return (
    <>
      <div className="player-glass absolute inset-x-0 bottom-0 z-30 px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(240px,1.2fr)_minmax(0,1fr)] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="player-cover-expand group relative size-12 shrink-0 overflow-hidden rounded-md disabled:pointer-events-none disabled:opacity-50"
              disabled={!current}
              aria-label={t('player.expandNowPlaying')}
              onClick={openLyrics}
            >
              <CoverImage
                path={current?.cover_path}
                alt={current?.title || ''}
                accent={accent}
                className="size-12 rounded-md"
                iconClassName="size-5"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <ChevronUpIcon className="size-5 text-white drop-shadow" strokeWidth={2.25} />
              </span>
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">
                {current?.title ?? t('player.notPlaying')}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {current?.artist ?? t('player.pickTrack')}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full!"
              aria-label={liked ? t('player.unlike') : t('player.like')}
              disabled={!current || !onToggleLiked}
              onClick={() => onToggleLiked?.()}
            >
              <StarIcon
                className={cn('size-4', liked && 'fill-current')}
              />
            </Button>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'rounded-full! size-9! relative text-muted-foreground',
                      shuffle && 'text-foreground hover:text-foreground'
                    )}
                    aria-label={shuffleTooltip}
                    aria-pressed={shuffle}
                    onClick={onToggleShuffle}
                  >
                    <ShuffleIcon className="size-3.5" />
                    {shuffle ? (
                      <span className="bg-foreground absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full" />
                    ) : null}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{shuffleTooltip}</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full! size-9!"
                aria-label={t('player.previous')}
                disabled={!current}
                onClick={onPrevious}
              >
                <SkipBackIcon className="size-4 fill-current" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full! size-11!"
                aria-label={playing ? t('common.pause') : t('common.play')}
                disabled={!current}
                onClick={onToggle}
              >
                {playing ? (
                  <PauseIcon className="size-5 fill-current" />
                ) : (
                  <PlayIcon className="size-5 fill-current" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full! size-9!"
                aria-label={t('player.next')}
                disabled={!current}
                onClick={onNext}
              >
                <SkipForwardIcon className="size-4 fill-current" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'rounded-full! size-9! relative text-muted-foreground',
                      repeatMode !== 'off' && 'text-foreground hover:text-foreground'
                    )}
                    aria-label={repeatTooltip}
                    aria-pressed={repeatMode !== 'off'}
                    onClick={onCycleRepeat}
                  >
                    {repeatMode === 'one' ? (
                      <Repeat1Icon className="size-3.5" />
                    ) : (
                      <Repeat2Icon className="size-3.5" />
                    )}
                    {repeatMode !== 'off' ? (
                      <span className="bg-foreground absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full" />
                    ) : null}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{repeatTooltip}</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex w-full max-w-xl items-center gap-2">
              <span className="text-muted-foreground w-9 text-right text-[11px] tabular-nums">
                {formatDuration(currentTime)}
              </span>
              <Slider
                value={[Math.min(currentTime, total || 0)]}
                max={Math.max(total, 1)}
                step={0.1}
                disabled={!current}
                onValueChange={(value) => onSeek(value[0] ?? 0)}
                aria-label={t('player.progress')}
                className="flex-1"
              />
              <span className="text-muted-foreground w-10 text-[11px] tabular-nums">
                {formatRemaining(currentTime, total)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full!"
              aria-label={t('player.queue')}
              aria-pressed={queueOpen}
              onClick={() => setQueueOpen(true)}
            >
              <ListMusicIcon
                className={cn('size-4', queue.length > 0 && 'text-primary')}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full!"
              aria-label={muted || volume === 0 ? t('player.unmute') : t('player.mute')}
              onClick={onMuteToggle}
            >
              {muted || volume === 0 ? (
                <VolumeXIcon className="size-4" />
              ) : (
                <Volume1Icon className="size-4" />
              )}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={(value) => onVolume(value[0] ?? 0)}
              aria-label={t('player.volume')}
              className="w-20"
            />
          </div>
        </div>
      </div>

      <PlayQueuePanel
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        current={current}
        onPlay={onPlayFromQueue}
        onRemove={onRemoveFromQueue}
        onClear={onClearQueue}
      />

      {lyricsMounted && current ? (
        <NowPlayingLyrics
          track={current}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          liked={liked}
          shuffle={shuffle}
          repeatMode={repeatMode}
          visible={lyricsShown}
          onClose={closeLyrics}
          onToggle={onToggle}
          onSeek={onSeek}
          onVolume={onVolume}
          onMuteToggle={onMuteToggle}
          onPrevious={onPrevious}
          onNext={onNext}
          onToggleShuffle={onToggleShuffle}
          onCycleRepeat={onCycleRepeat}
          onToggleLiked={onToggleLiked}
        />
      ) : null}
    </>
  )
}
