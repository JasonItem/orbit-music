import { useMemo, useState } from 'react'
import { PlayIcon, ShuffleIcon } from 'lucide-react'
import { AlbumCoverCard } from '@/components/app/album-cover-card'
import { CoverImage } from '@/components/app/cover-image'
import { TrackRowList } from '@/components/app/track-row-list'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { groupTracks, type TrackGroup } from '@/lib/library-groups'
import { useT } from '@/i18n/react'
import type { Playlist, Track } from '@/types/music'

interface ArtistDetailPageProps {
  artist: TrackGroup
  onPlay: (track: Track, queue: Track[]) => void
  onAddToQueue?: (tracks: Track | Track[]) => void
  onOpenAlbum: (albumId: string) => void
  onOpenArtist?: (artistName: string) => void
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
}

function shuffleTracks(tracks: Track[]) {
  const next = [...tracks]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export function ArtistDetailPage({
  artist,
  onPlay,
  onAddToQueue,
  onOpenAlbum,
  onOpenArtist,
  playlists = [],
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onReorder,
}: ArtistDetailPageProps) {
  const t = useT()
  const [tab, setTab] = useState('songs')
  const albums = useMemo(
    () => groupTracks(artist.items, 'albums'),
    [artist.items]
  )

  const playAll = () => {
    const first = artist.items[0]
    if (first) onPlay(first, artist.items)
  }

  const playShuffle = () => {
    const queue = shuffleTracks(artist.items)
    const first = queue[0]
    if (first) onPlay(first, queue)
  }

  return (
    <ScrollArea className="h-full bg-transparent">
      <div className="flex flex-col gap-8 p-6 pb-28">
        <div className="flex flex-wrap items-end gap-6">
          <CoverImage
            path={artist.coverPath}
            alt={artist.name}
            accent={artist.accent}
            className="size-36 shrink-0 rounded-full shadow-2xl shadow-black/40 sm:size-44"
            iconClassName="size-12"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-brand">
                {t('common.artist')}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {artist.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t('common.artistAlbumMeta', {
                  tracks: artist.count,
                  albums: albums.length,
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

        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {tab === 'songs' ? t('nav.songs') : t('nav.albums')}
            </h2>
            <TabsList>
              <TabsTrigger value="songs">{t('nav.songs')}</TabsTrigger>
              <TabsTrigger value="albums">{t('nav.albums')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="songs" className="mt-0">
            <TrackRowList
              tracks={artist.items}
              accent={artist.accent}
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
              onOpenAlbum={(albumId) => onOpenAlbum(albumId)}
            />
          </TabsContent>

          <TabsContent value="albums" className="mt-0">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {albums.map((album) => (
                <AlbumCoverCard
                  key={album.name}
                  group={album}
                  year={
                    album.items.find((track) => track.year)?.year ??
                    new Date().getFullYear()
                  }
                  onOpen={() => onOpenAlbum(album.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}
