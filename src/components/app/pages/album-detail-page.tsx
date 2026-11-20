import { PlayIcon, ShuffleIcon } from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { TrackRowList } from '@/components/app/track-row-list'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TrackGroup } from '@/lib/library-groups'
import { useT } from '@/i18n/react'
import type { Playlist, Track } from '@/types/music'

interface AlbumDetailPageProps {
  album: TrackGroup
  onPlay: (track: Track, queue: Track[]) => void
  onAddToQueue?: (tracks: Track | Track[]) => void
  playlists?: Playlist[]
  onAddToPlaylist?: (playlistId: number, track: Track) => void
  onBulkAddToPlaylist?: (
    playlistId: number,
    tracks: Track[]
  ) => Promise<void> | void
  onDeleteTrack?: (track: Track, deleteFile: boolean) => Promise<void> | void
  onBulkDeleteTracks?: (
    tracks: Track[],
    deleteFile: boolean
  ) => Promise<void> | void
  onReorder?: (orderedIds: number[]) => Promise<void> | void
  onOpenArtist?: (artistName: string) => void
}

function shuffleTracks(tracks: Track[]) {
  const next = [...tracks]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export function AlbumDetailPage({
  album,
  onPlay,
  onAddToQueue,
  playlists = [],
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onReorder,
  onOpenArtist,
}: AlbumDetailPageProps) {
  const t = useT()
  const year =
    album.items.find((track) => track.year)?.year ??
    new Date().getFullYear()
  const artist =
    [...new Set(album.items.map((track) => track.artist))].join(' / ') ||
    t('common.unknownArtist')

  const playAll = () => {
    const first = album.items[0]
    if (first) onPlay(first, album.items)
  }

  const playShuffle = () => {
    const queue = shuffleTracks(album.items)
    const first = queue[0]
    if (first) onPlay(first, queue)
  }

  return (
    <ScrollArea className="h-full bg-transparent">
      <div className="flex flex-col gap-8 p-6 pb-28">
        <div className="flex flex-wrap items-end gap-6">
          <CoverImage
            path={album.coverPath}
            alt={album.name}
            accent={album.accent}
            className="size-36 shrink-0 rounded-xl shadow-2xl shadow-black/40 sm:size-44"
            iconClassName="size-12"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-brand">
                {t('common.album')}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {album.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t('common.albumMeta', {
                  artist,
                  year,
                  count: album.count,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={playAll}
              >
                <PlayIcon data-icon="inline-start" className="fill-current" />
                {t('common.play')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={playShuffle}
              >
                <ShuffleIcon data-icon="inline-start" />
                {t('common.shufflePlay')}
              </Button>
            </div>
          </div>
        </div>

          <TrackRowList
            tracks={album.items}
            accent={album.accent}
            variant="album"
            playlists={playlists}
            onPlay={onPlay}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            onBulkAddToPlaylist={onBulkAddToPlaylist}
            onDeleteTrack={onDeleteTrack}
            onBulkDeleteTracks={onBulkDeleteTracks}
            onReorder={onReorder}
            onOpenArtist={onOpenArtist}
          />
      </div>
    </ScrollArea>
  )
}
