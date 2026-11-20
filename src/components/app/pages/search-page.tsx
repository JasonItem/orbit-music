import { useMemo, useState, type ReactNode } from 'react'
import {
  LayoutGridIcon,
  ListMusicIcon,
  SearchIcon,
  UserRoundIcon,
} from 'lucide-react'
import { AlbumCoverCard } from '@/components/app/album-cover-card'
import { CoverImage } from '@/components/app/cover-image'
import { PageEmpty } from '@/components/app/page-empty'
import { TrackRowList } from '@/components/app/track-row-list'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { accentForName, groupTracks } from '@/lib/library-groups'
import { useT } from '@/i18n/react'
import type { Playlist, Track } from '@/types/music'

type SearchTab = 'songs' | 'artists' | 'albums' | 'playlists'

interface SearchPageProps {
  query: string
  tracks: Track[]
  playlists: Playlist[]
  onPlay: (track: Track, queue: Track[]) => void
  onAddToQueue?: (tracks: Track | Track[]) => void
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
  onOpenArtist: (artistName: string) => void
  onOpenAlbum: (albumId: string, albumName?: string) => void
  onOpenPlaylist: (playlistId: number) => void
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function trackMatchesQuery(track: Track, query: string) {
  const q = normalize(query)
  if (!q) return false
  return (
    normalize(track.title).includes(q) ||
    normalize(track.artist).includes(q) ||
    normalize(track.album).includes(q)
  )
}

function SearchEmpty({ icon, title }: { icon: ReactNode; title: string }) {
  return <PageEmpty icon={icon} title={title} className="p-0 pb-0" />
}

export function SearchPage({
  query,
  tracks,
  playlists,
  onPlay,
  onAddToQueue,
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}: SearchPageProps) {
  const t = useT()
  const [tab, setTab] = useState<SearchTab>('songs')
  const trimmed = query.trim()

  const matchedTracks = useMemo(
    () => tracks.filter((track) => trackMatchesQuery(track, trimmed)),
    [tracks, trimmed]
  )

  const artists = useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return groupTracks(tracks, 'artists').filter((group) =>
      normalize(group.name).includes(q)
    )
  }, [tracks, trimmed])

  const albums = useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return groupTracks(tracks, 'albums').filter((group) =>
      normalize(group.name).includes(q)
    )
  }, [tracks, trimmed])

  const matchedPlaylists = useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return playlists.filter((playlist) => normalize(playlist.name).includes(q))
  }, [playlists, trimmed])

  const header = (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">
        {t('search.eyebrow', { count: matchedTracks.length })}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">“{trimmed}”</h1>
    </div>
  )

  const tabsList = (
    <TabsList>
      <TabsTrigger value="songs">{t('nav.songs')}</TabsTrigger>
      <TabsTrigger value="artists">{t('nav.artists')}</TabsTrigger>
      <TabsTrigger value="albums">{t('nav.albums')}</TabsTrigger>
      <TabsTrigger value="playlists">{t('search.tabPlaylists')}</TabsTrigger>
    </TabsList>
  )

  if (!trimmed) {
    return (
      <PageEmpty
        icon={<SearchIcon />}
        title={t('search.enterHint')}
        className="h-full"
      />
    )
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as SearchTab)}
      className="flex h-full min-h-0 flex-col gap-5 p-6 pb-28"
    >
      <div className="flex shrink-0 flex-col gap-5">
        {header}
        {tabsList}
      </div>

      <TabsContent
        value="songs"
        className="mt-0 flex min-h-0 flex-1 flex-col"
      >
        {matchedTracks.length === 0 ? (
          <SearchEmpty icon={<SearchIcon />} title={t('search.emptySongs')} />
        ) : (
          <ScrollArea className="h-full">
              <TrackRowList
                tracks={matchedTracks}
                variant="playlist"
                playlists={playlists}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                onAddToPlaylist={onAddToPlaylist}
                onBulkAddToPlaylist={onBulkAddToPlaylist}
                onDeleteTrack={onDeleteTrack}
                onBulkDeleteTracks={onBulkDeleteTracks}
                onOpenArtist={onOpenArtist}
                onOpenAlbum={onOpenAlbum}
              />
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent
        value="artists"
        className="mt-0 flex min-h-0 flex-1 flex-col"
      >
        {artists.length === 0 ? (
          <SearchEmpty
            icon={<UserRoundIcon />}
            title={t('search.emptyArtists')}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {artists.map((artist) => (
                <AlbumCoverCard
                  key={artist.name}
                  group={artist}
                  onOpen={() => onOpenArtist(artist.name)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="albums" className="mt-0 flex min-h-0 flex-1 flex-col">
        {albums.length === 0 ? (
          <SearchEmpty
            icon={<LayoutGridIcon />}
            title={t('search.emptyAlbums')}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {albums.map((album) => (
                <AlbumCoverCard
                  key={album.name}
                  group={album}
                  year={
                    album.items.find((track) => track.year)?.year ?? undefined
                  }
                  onOpen={() => onOpenAlbum(album.id, album.name)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent
        value="playlists"
        className="mt-0 flex min-h-0 flex-1 flex-col"
      >
        {matchedPlaylists.length === 0 ? (
          <SearchEmpty
            icon={<ListMusicIcon />}
            title={t('search.emptyPlaylists')}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1">
              {matchedPlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className="hover:bg-muted/60 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
                  onClick={() => onOpenPlaylist(playlist.id)}
                >
                  <CoverImage
                    path={playlist.cover_path}
                    alt=""
                    accent={accentForName(playlist.name)}
                    className="size-12 shrink-0 rounded-md"
                    iconClassName="size-4"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{playlist.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {t('common.trackCount', {
                        count: playlist.track_count ?? 0,
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
    </Tabs>
  )
}
