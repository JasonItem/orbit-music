import { useEffect } from 'react'
import { FolderOpenIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { LibraryOnboarding } from '@/components/app/library-onboarding'
import { TrackRowList } from '@/components/app/track-row-list'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/i18n/react'
import type { Playlist, Track } from '@/types/music'

interface SongsPageProps {
  title?: string
  tracks: Track[]
  total: number
  loading: boolean
  error: string | null
  search: string
  importing: boolean
  importProgress: { done: number; total: number } | null
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onImportFolder: () => void
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
  onOpenAlbum?: (albumId: string, albumName: string) => void
}

export function SongsPage({
  title,
  tracks,
  total,
  loading,
  importing,
  importProgress,
  onRefresh,
  onImportFolder,
  onPlay,
  onAddToQueue,
  playlists = [],
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onReorder,
  onOpenArtist,
  onOpenAlbum,
}: SongsPageProps) {
  const t = useT()
  const pageTitle = title ?? t('nav.songs')

  useEffect(() => {
    if (importing && importProgress) {
      toast.loading(
        t('songs.importing', {
          done: importProgress.done,
          total: importProgress.total || '…',
        }),
        { id: 'import-progress' }
      )
    } else {
      toast.dismiss('import-progress')
    }
  }, [importing, importProgress, t])

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-brand">
          {t('common.library')}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
        <p className="text-muted-foreground text-sm">
          {t('common.trackCountLabeled', { count: total })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading || importing}
        >
          <RefreshCwIcon data-icon="inline-start" />
          {t('songs.refresh')}
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={onImportFolder}
          disabled={importing}
        >
          <FolderOpenIcon data-icon="inline-start" />
          {t('songs.importFolder')}
        </Button>
      </div>
    </div>
  )

  if (!loading && tracks.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <LibraryOnboarding onImportFolder={onImportFolder} />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6 pb-28">
        {toolbar}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <TrackRowList
            tracks={tracks}
            variant="playlist"
            playlists={playlists}
            onPlay={onPlay}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            onBulkAddToPlaylist={onBulkAddToPlaylist}
            onDeleteTrack={onDeleteTrack}
            onBulkDeleteTracks={onBulkDeleteTracks}
            onReorder={onReorder}
            onOpenArtist={onOpenArtist}
            onOpenAlbum={onOpenAlbum}
          />
        )}
      </div>
    </ScrollArea>
  )
}
