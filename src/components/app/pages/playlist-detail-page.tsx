import { useMemo, useState } from 'react'
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  ShuffleIcon,
  Trash2Icon,
} from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { CoverDiscIcon } from '@/components/app/icons/cover-disc-icon'
import { PageEmpty } from '@/components/app/page-empty'
import { RenamePlaylistDialog } from '@/components/app/rename-playlist-dialog'
import { TrackRowList } from '@/components/app/track-row-list'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { accentForName } from '@/lib/library-groups'
import {
  playlistDisplayDescription,
  playlistDisplayName,
} from '@/i18n'
import { useT } from '@/i18n/react'
import type { Playlist, Track } from '@/types/music'

interface PlaylistDetailPageProps {
  playlist: Playlist
  tracks: Track[]
  loading?: boolean
  ownerLabel?: string
  onPlay: (track: Track, queue: Track[]) => void
  onAddToQueue?: (tracks: Track | Track[]) => void
  onRemoveTrack?: (track: Track) => void
  onBulkRemoveFromPlaylist?: (tracks: Track[]) => Promise<void> | void
  onDeleteTrack?: (track: Track, deleteFile: boolean) => Promise<void> | void
  onBulkDeleteTracks?: (
    tracks: Track[],
    deleteFile: boolean
  ) => Promise<void> | void
  onDeletePlaylist?: () => void
  onRenamePlaylist?: (name: string, description: string) => Promise<void>
  playlistsForAdd?: Playlist[]
  onAddToPlaylist?: (playlistId: number, track: Track) => void
  onBulkAddToPlaylist?: (
    playlistId: number,
    tracks: Track[]
  ) => Promise<void> | void
  onReorder?: (orderedIds: number[]) => Promise<void> | void
  onOpenArtist?: (artistName: string) => void
  onOpenAlbum?: (albumId: string, albumName: string) => void
}

function shuffleTracks(tracks: Track[]) {
  const next = [...tracks]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export function PlaylistDetailPage({
  playlist,
  tracks,
  loading = false,
  ownerLabel,
  onPlay,
  onAddToQueue,
  onRemoveTrack,
  onBulkRemoveFromPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onDeletePlaylist,
  onRenamePlaylist,
  playlistsForAdd = [],
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onReorder,
  onOpenArtist,
  onOpenAlbum,
}: PlaylistDetailPageProps) {
  const t = useT()
  const resolvedOwnerLabel = ownerLabel ?? t('common.local')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const displayName = playlistDisplayName(playlist, t)
  const displayDescription = playlistDisplayDescription(playlist, t)
  const accent = useMemo(() => accentForName(displayName), [displayName])
  const coverPath = useMemo(
    () =>
      tracks.find((track) => track.cover_path)?.cover_path ??
      playlist.cover_path ??
      null,
    [tracks, playlist.cover_path]
  )
  const canEdit =
    playlist.kind !== 'liked' &&
    (Boolean(onDeletePlaylist) || Boolean(onRenamePlaylist))
  const isEmpty = !loading && tracks.length === 0

  const playAll = () => {
    const first = tracks[0]
    if (first) onPlay(first, tracks)
  }

  const playShuffle = () => {
    const queue = shuffleTracks(tracks)
    const first = queue[0]
    if (first) onPlay(first, queue)
  }

  const header = (
    <div className="flex flex-wrap items-end gap-6">
      <CoverImage
        path={coverPath}
        alt={displayName}
        accent={accent}
        className="size-36 shrink-0 rounded-xl shadow-2xl shadow-black/40 sm:size-44"
        iconClassName="size-12"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-brand">
            {t('common.playlist')}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {displayName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('common.playlistMeta', {
              owner: resolvedOwnerLabel,
              count: tracks.length,
            })}
          </p>
          {displayDescription ? (
            <p className="text-muted-foreground line-clamp-2 max-w-2xl text-sm">
              {displayDescription}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={!tracks.length}
            onClick={playAll}
          >
            <PlayIcon data-icon="inline-start" className="fill-current" />
            {t('common.play')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!tracks.length}
            onClick={playShuffle}
          >
            <ShuffleIcon data-icon="inline-start" />
            {t('common.shufflePlay')}
          </Button>
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.more')}
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onRenamePlaylist ? (
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <PencilIcon />
                    {t('common.rename')}
                  </DropdownMenuItem>
                ) : null}
                {onDeletePlaylist ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2Icon />
                    {t('playlist.deletePlaylist')}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {isEmpty ? (
        <div className="flex h-full min-h-0 flex-col bg-transparent p-6">
          <div className="shrink-0">{header}</div>
          <PageEmpty
            icon={<CoverDiscIcon />}
            title={t('playlist.emptyTitle')}
            description={t('playlist.emptyDescription')}
            className="pb-28"
          />
        </div>
      ) : (
        <ScrollArea className="h-full bg-transparent">
          <div className="flex flex-col gap-8 p-6 pb-28">
            {header}
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : (
                <TrackRowList
                  tracks={tracks}
                  accent={accent}
                  variant="playlist"
                  playlists={playlistsForAdd}
                  onPlay={onPlay}
                  onAddToQueue={onAddToQueue}
                  onAddToPlaylist={onAddToPlaylist}
                  onBulkAddToPlaylist={onBulkAddToPlaylist}
                  onRemoveFromPlaylist={onRemoveTrack}
                  onBulkRemoveFromPlaylist={onBulkRemoveFromPlaylist}
                  onDeleteTrack={onDeleteTrack}
                  onBulkDeleteTracks={onBulkDeleteTracks}
                  onReorder={onReorder}
                  onOpenArtist={onOpenArtist}
                  onOpenAlbum={onOpenAlbum}
                />
            )}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('playlist.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('playlist.deleteDescription', { name: displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDeletePlaylist?.()}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {onRenamePlaylist ? (
        <RenamePlaylistDialog
          open={renameOpen}
          name={playlist.name}
          description={playlist.description}
          onOpenChange={setRenameOpen}
          onSubmit={onRenamePlaylist}
        />
      ) : null}
    </>
  )
}
