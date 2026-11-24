import { ListMusicIcon, Trash2Icon, XIcon } from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/react'
import type { Track } from '@/types/music'

interface PlayQueuePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queue: Track[]
  current: Track | null
  onPlay: (track: Track) => void
  onRemove: (trackId: number) => void
  onClear: () => void
}

export function PlayQueuePanel({
  open,
  onOpenChange,
  queue,
  current,
  onPlay,
  onRemove,
  onClear,
}: PlayQueuePanelProps) {
  const t = useT()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay
        overlayClassName="bg-black/20"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-border flex-row items-center justify-between space-y-0 border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ListMusicIcon className="size-4" />
            {t('player.queue')}
            <span className="text-muted-foreground text-sm font-normal">
              {queue.length}
            </span>
          </SheetTitle>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mr-8"
            disabled={queue.length <= (current ? 1 : 0)}
            onClick={onClear}
          >
            <Trash2Icon data-icon="inline-start" />
            {t('player.queueClear')}
          </Button>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <div className="px-2 py-2">
            {queue.length === 0 ? (
              <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                {t('player.queueEmpty')}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {queue.map((track, index) => {
                  const active = current?.id === track.id
                  const missing = Boolean(track.missing)
                  return (
                    <div
                      key={`${track.id}-${index}`}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg px-2 py-2',
                        active ? 'bg-muted' : 'hover:bg-muted/60',
                        missing && 'opacity-45'
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        disabled={missing}
                        onClick={() => onPlay(track)}
                      >
                        <span className="text-muted-foreground w-5 shrink-0 text-center text-xs tabular-nums">
                          {index + 1}
                        </span>
                        <CoverImage
                          path={missing ? null : track.cover_path}
                          alt={track.title}
                          className="size-10 shrink-0 rounded-md"
                          iconClassName="size-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              'truncate text-sm font-medium',
                              active && 'text-primary'
                            )}
                          >
                            {track.title}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {track.artist || t('common.unknownArtist')}
                          </div>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatDuration(track.duration)}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100"
                        aria-label={t('player.queueRemove')}
                        onClick={() => onRemove(track.id)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
