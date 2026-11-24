import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { AppSidebar } from '@/components/app/app-sidebar'
import { CreatePlaylistDialog } from '@/components/app/create-playlist-dialog'
import { DetailBlurBackground } from '@/components/app/detail-blur-background'
import { PlayerBar } from '@/components/app/player-bar'
import { WindowControls } from '@/components/app/window-controls'
import { Button } from '@/components/ui/button'
import { AlbumDetailPage } from '@/components/app/pages/album-detail-page'
import { AlbumsPage } from '@/components/app/pages/albums-page'
import { ArtistDetailPage } from '@/components/app/pages/artist-detail-page'
import { ArtistsPage } from '@/components/app/pages/artists-page'
import { PlaylistDetailPage } from '@/components/app/pages/playlist-detail-page'
import { SearchPage } from '@/components/app/pages/search-page'
import { SongsPage } from '@/components/app/pages/songs-page'
import { useLibrary } from '@/hooks/use-library'
import { usePlayer } from '@/hooks/use-player'
import { usePlaylists } from '@/hooks/use-playlists'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { groupTracks } from '@/lib/library-groups'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/react'
import {
  isPluginTrack,
  type NavId,
  type Playlist,
  type Track,
} from '@/types/music'

type DetailFrom = 'artists' | 'albums' | 'artist'

type ShellLocation = {
  nav: NavId
  playlistId: number | null
  artist: string | null
  album: string | null
  detailFrom: DetailFrom
  searchQuery: string
}

const INITIAL_LOCATION: ShellLocation = {
  nav: 'songs',
  playlistId: null,
  artist: null,
  album: null,
  detailFrom: 'albums',
  searchQuery: '',
}

function locationsEqual(a: ShellLocation, b: ShellLocation) {
  return (
    a.nav === b.nav &&
    a.playlistId === b.playlistId &&
    a.artist === b.artist &&
    a.album === b.album &&
    a.detailFrom === b.detailFrom &&
    a.searchQuery === b.searchQuery
  )
}

export function MusicShell() {
  const t = useT()
  const [nav, setNav] = useState<NavId>(INITIAL_LOCATION.nav)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    INITIAL_LOCATION.playlistId
  )
  const [selectedArtist, setSelectedArtist] = useState<string | null>(
    INITIAL_LOCATION.artist
  )
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(
    INITIAL_LOCATION.album
  )
  const [detailFrom, setDetailFrom] = useState<DetailFrom>(
    INITIAL_LOCATION.detailFrom
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([])
  const [playlistMeta, setPlaylistMeta] = useState<Playlist | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [currentLiked, setCurrentLiked] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState(INITIAL_LOCATION.searchQuery)
  const [navHistory, setNavHistory] = useState<ShellLocation[]>([
    INITIAL_LOCATION,
  ])
  const [navIndex, setNavIndex] = useState(0)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const navIndexRef = useRef(0)
  const isTraversingRef = useRef(false)

  const library = useLibrary()
  const player = usePlayer()
  const playlistsApi = usePlaylists()

  const currentLocation = useMemo<ShellLocation>(
    () => ({
      nav,
      playlistId: selectedPlaylistId,
      artist: selectedArtist,
      album: selectedAlbum,
      detailFrom,
      searchQuery,
    }),
    [
      nav,
      selectedPlaylistId,
      selectedArtist,
      selectedAlbum,
      detailFrom,
      searchQuery,
    ]
  )

  useEffect(() => {
    navIndexRef.current = navIndex
  }, [navIndex])

  useEffect(() => {
    if (isTraversingRef.current) {
      isTraversingRef.current = false
      return
    }
    setNavHistory((prev) => {
      const head = prev.slice(0, navIndexRef.current + 1)
      const last = head[head.length - 1]
      if (last && locationsEqual(last, currentLocation)) return prev
      const next = [...head, currentLocation]
      navIndexRef.current = next.length - 1
      setNavIndex(next.length - 1)
      return next
    })
  }, [currentLocation])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (
        !window.musicApp ||
        !player.current ||
        !playlistsApi.liked ||
        isPluginTrack(player.current)
      ) {
        setCurrentLiked(false)
        return
      }
      const liked = await window.musicApp.isTrackInPlaylist(
        playlistsApi.liked.id,
        player.current.id
      )
      if (!cancelled) setCurrentLiked(liked)
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [player.current, playlistsApi.liked])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (nav === 'liked') {
        const liked = playlistsApi.liked
        if (!liked) {
          setPlaylistMeta(null)
          setPlaylistTracks([])
          return
        }
        setPlaylistLoading(true)
        try {
          const tracks = await playlistsApi.loadPlaylistTracks(liked.id)
          if (!cancelled) {
            setPlaylistMeta(liked)
            setPlaylistTracks(tracks)
          }
        } finally {
          if (!cancelled) setPlaylistLoading(false)
        }
        return
      }

      if (nav === 'playlist' && selectedPlaylistId != null) {
        setPlaylistLoading(true)
        try {
          const [meta, tracks] = await Promise.all([
            playlistsApi.getPlaylist(selectedPlaylistId),
            playlistsApi.loadPlaylistTracks(selectedPlaylistId),
          ])
          if (!cancelled) {
            setPlaylistMeta(meta)
            setPlaylistTracks(tracks)
          }
        } finally {
          if (!cancelled) setPlaylistLoading(false)
        }
        return
      }

      setPlaylistMeta(null)
      setPlaylistTracks([])
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    nav,
    selectedPlaylistId,
    playlistsApi.liked,
    playlistsApi.loadPlaylistTracks,
    playlistsApi.getPlaylist,
    playlistsApi.playlists,
  ])

  const artists = useMemo(
    () => groupTracks(library.tracks, 'artists'),
    [library.tracks]
  )
  const albums = useMemo(
    () => groupTracks(library.tracks, 'albums'),
    [library.tracks]
  )

  const currentArtist = selectedArtist
    ? (artists.find((item) => item.name === selectedArtist) ?? null)
    : null
  const currentAlbum = selectedAlbum
    ? (albums.find((item) => item.id === selectedAlbum || item.name === selectedAlbum) ??
      null)
    : null

  const showDetailBackdrop =
    (nav === 'albums' && Boolean(currentAlbum)) ||
    (nav === 'artists' && Boolean(currentArtist || currentAlbum)) ||
    ((nav === 'playlist' || nav === 'liked') && Boolean(playlistMeta))

  const detailBackdropCover = useMemo(() => {
    if (nav === 'albums' && currentAlbum) return currentAlbum.coverPath
    if (nav === 'artists' && currentAlbum) return currentAlbum.coverPath
    if (nav === 'artists' && currentArtist) return currentArtist.coverPath
    if (nav === 'playlist' || nav === 'liked') {
      return (
        playlistTracks.find((track) => track.cover_path)?.cover_path ??
        playlistMeta?.cover_path ??
        null
      )
    }
    return null
  }, [nav, currentAlbum, currentArtist, playlistTracks, playlistMeta])

  const canGoBack = navIndex > 0
  const canGoForward = navIndex < navHistory.length - 1

  const applyLocation = (location: ShellLocation) => {
    setNav(location.nav)
    setSelectedPlaylistId(location.playlistId)
    setSelectedArtist(location.artist)
    setSelectedAlbum(location.album)
    setDetailFrom(location.detailFrom)
    setSearchQuery(location.searchQuery)
    if (location.nav === 'search' || location.searchQuery) {
      setSearchDraft(location.searchQuery)
    }
  }

  const handleNavBack = () => {
    if (!canGoBack) return
    const nextIndex = navIndex - 1
    const location = navHistory[nextIndex]
    if (!location) return
    isTraversingRef.current = true
    navIndexRef.current = nextIndex
    setNavIndex(nextIndex)
    applyLocation(location)
  }

  const handleNavForward = () => {
    if (!canGoForward) return
    const nextIndex = navIndex + 1
    const location = navHistory[nextIndex]
    if (!location) return
    isTraversingRef.current = true
    navIndexRef.current = nextIndex
    setNavIndex(nextIndex)
    applyLocation(location)
  }

  const playTrack = (track: Track, queue: Track[]) => {
    void player.playTrack(track, queue)
  }

  const addToQueue = (tracks: Track | Track[]) => {
    player.addToQueue(tracks)
  }

  const songsProps = {
    tracks: library.tracks,
    total: library.total,
    loading: library.loading,
    error: library.error,
    search: searchDraft,
    importing: library.importing,
    importProgress: library.importProgress,
    onSearchChange: setSearchDraft,
    onRefresh: () => void library.refresh(),
    onImportFolder: () => void library.importFolder(),
    onPlay: playTrack,
    onAddToQueue: addToQueue,
  }

  const openArtist = (name: string) => {
    setSelectedAlbum(null)
    setSelectedArtist(name)
    setDetailFrom('artists')
  }

  const openAlbum = (
    name: string,
    from: 'artists' | 'albums' | 'artist' = 'albums'
  ) => {
    setSelectedAlbum(name)
    setDetailFrom(from)
  }

  const openArtistFromList = (name: string) => {
    setSelectedPlaylistId(null)
    setSelectedAlbum(null)
    setSelectedArtist(name)
    setDetailFrom('artists')
    setNav('artists')
  }

  const openAlbumFromList = (albumId: string) => {
    setSelectedPlaylistId(null)
    setSelectedArtist(null)
    setSelectedAlbum(albumId)
    setDetailFrom('albums')
    setNav('albums')
  }

  const handleNavigate = (id: NavId, playlistId?: number) => {
    setNav(id)
    setSelectedArtist(null)
    setSelectedAlbum(null)
    if (id === 'playlist' && playlistId != null) {
      setSelectedPlaylistId(playlistId)
    } else if (id !== 'playlist') {
      setSelectedPlaylistId(null)
    }
  }

  const handleSearchSubmit = (raw: string) => {
    const query = raw.trim()
    if (!query) return
    setSearchDraft(query)
    setSearchQuery(query)
    setSelectedArtist(null)
    setSelectedAlbum(null)
    setSelectedPlaylistId(null)
    setNav('search')
  }

  const openArtistFromSearch = (name: string) => {
    setSelectedPlaylistId(null)
    setSelectedAlbum(null)
    setSelectedArtist(name)
    setDetailFrom('artists')
    setNav('artists')
  }

  const openAlbumFromSearch = (name: string) => {
    setSelectedPlaylistId(null)
    setSelectedArtist(null)
    setSelectedAlbum(name)
    setDetailFrom('albums')
    setNav('albums')
  }

  const openPlaylistFromSearch = (playlistId: number) => {
    setSelectedArtist(null)
    setSelectedAlbum(null)
    setSelectedPlaylistId(playlistId)
    setNav('playlist')
  }

  const refreshCurrentPlaylist = async () => {
    if (nav === 'liked' && playlistsApi.liked) {
      const tracks = await playlistsApi.loadPlaylistTracks(playlistsApi.liked.id)
      setPlaylistMeta(playlistsApi.liked)
      setPlaylistTracks(tracks)
    } else if (nav === 'playlist' && selectedPlaylistId != null) {
      const [meta, tracks] = await Promise.all([
        playlistsApi.getPlaylist(selectedPlaylistId),
        playlistsApi.loadPlaylistTracks(selectedPlaylistId),
      ])
      setPlaylistMeta(meta)
      setPlaylistTracks(tracks)
    }
    await playlistsApi.refresh()
  }

  const handleNavRefresh = () => {
    void library.refresh()
    void playlistsApi.refresh()
    void refreshCurrentPlaylist()
  }

  const handleAddToPlaylist = async (playlistId: number, track: Track) => {
    await playlistsApi.addTrackToPlaylist(playlistId, track.id)
    await refreshCurrentPlaylist()
  }

  const handleBulkAddToPlaylist = async (
    playlistId: number,
    tracks: Track[]
  ) => {
    await playlistsApi.addTracksToPlaylist(
      playlistId,
      tracks.map((track) => track.id)
    )
    await refreshCurrentPlaylist()
  }

  const handleRemoveFromPlaylist = async (track: Track) => {
    const targetId =
      nav === 'liked'
        ? playlistsApi.liked?.id
        : selectedPlaylistId
    if (targetId == null) return
    await playlistsApi.removeTrackFromPlaylist(targetId, track.id)
    await refreshCurrentPlaylist()
  }

  const handleBulkRemoveFromPlaylist = async (tracks: Track[]) => {
    const targetId =
      nav === 'liked' ? playlistsApi.liked?.id : selectedPlaylistId
    if (targetId == null) return
    await playlistsApi.removeTracksFromPlaylist(
      targetId,
      tracks.map((track) => track.id)
    )
    await refreshCurrentPlaylist()
  }

  const handleDeleteTrack = async (track: Track, deleteFile: boolean) => {
    await library.removeTrack(track.id, { deleteFile })
    await playlistsApi.refresh()
    await refreshCurrentPlaylist()
  }

  const handleBulkDeleteTracks = async (
    tracks: Track[],
    deleteFile: boolean
  ) => {
    await library.removeTracks(
      tracks.map((track) => track.id),
      { deleteFile }
    )
    await playlistsApi.refresh()
    await refreshCurrentPlaylist()
  }

  const handleReorderLibraryTracks = async (trackIds: number[]) => {
    await library.reorderTracks(trackIds)
  }

  const handleReorderPlaylistTracks = async (trackIds: number[]) => {
    const targetId =
      nav === 'liked' ? playlistsApi.liked?.id : selectedPlaylistId
    if (targetId == null) return
    const next = await playlistsApi.reorderPlaylistTracks(targetId, trackIds)
    setPlaylistTracks(next)
  }

  let mainContent = null
  if (nav === 'songs') {
    mainContent = (
      <SongsPage
        {...songsProps}
        playlists={[
          ...(playlistsApi.liked ? [playlistsApi.liked] : []),
          ...playlistsApi.playlists,
        ]}
        onAddToPlaylist={handleAddToPlaylist}
        onBulkAddToPlaylist={handleBulkAddToPlaylist}
        onDeleteTrack={handleDeleteTrack}
        onBulkDeleteTracks={handleBulkDeleteTracks}
        onReorder={handleReorderLibraryTracks}
        onOpenArtist={openArtistFromList}
        onOpenAlbum={(albumId) => openAlbumFromList(albumId)}
      />
    )
  } else if (nav === 'liked' && playlistMeta) {
    mainContent = (
      <PlaylistDetailPage
        playlist={playlistMeta}
        tracks={playlistTracks}
        loading={playlistLoading}
        onPlay={playTrack}
        onAddToQueue={addToQueue}
        playlistsForAdd={playlistsApi.playlists}
        onAddToPlaylist={handleAddToPlaylist}
        onBulkAddToPlaylist={handleBulkAddToPlaylist}
        onRemoveTrack={handleRemoveFromPlaylist}
        onBulkRemoveFromPlaylist={handleBulkRemoveFromPlaylist}
        onDeleteTrack={handleDeleteTrack}
        onBulkDeleteTracks={handleBulkDeleteTracks}
        onReorder={handleReorderPlaylistTracks}
        onOpenArtist={openArtistFromList}
        onOpenAlbum={(albumId) => openAlbumFromList(albumId)}
      />
    )
  } else if (nav === 'liked') {
    mainContent = (
      <div className="text-muted-foreground p-6 text-sm">
        {t('playlist.loadingLiked')}
      </div>
    )
  } else if (nav === 'playlist' && playlistMeta) {
    mainContent = (
      <PlaylistDetailPage
        playlist={playlistMeta}
        tracks={playlistTracks}
        loading={playlistLoading}
        onPlay={playTrack}
        onAddToQueue={addToQueue}
        playlistsForAdd={playlistsApi.playlists.filter(
          (item) => item.id !== playlistMeta.id
        )}
        onAddToPlaylist={handleAddToPlaylist}
        onBulkAddToPlaylist={handleBulkAddToPlaylist}
        onRemoveTrack={handleRemoveFromPlaylist}
        onBulkRemoveFromPlaylist={handleBulkRemoveFromPlaylist}
        onDeleteTrack={handleDeleteTrack}
        onBulkDeleteTracks={handleBulkDeleteTracks}
        onReorder={handleReorderPlaylistTracks}
        onRenamePlaylist={async (name, description) => {
          const updated = await playlistsApi.renamePlaylist(
            playlistMeta.id,
            name,
            description
          )
          setPlaylistMeta(updated)
        }}
        onDeletePlaylist={async () => {
          const id = playlistMeta.id
          await playlistsApi.deletePlaylist(id)
          setSelectedPlaylistId(null)
          setNav('songs')
        }}
        onOpenArtist={openArtistFromList}
        onOpenAlbum={(albumId) => openAlbumFromList(albumId)}
      />
    )
  } else if (nav === 'playlist') {
    mainContent = (
      <div className="text-muted-foreground p-6 text-sm">
        {t('playlist.loading')}
      </div>
    )
  } else if (nav === 'albums') {
    if (currentAlbum) {
      mainContent = (
        <AlbumDetailPage
          album={currentAlbum}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          playlists={[
            ...(playlistsApi.liked ? [playlistsApi.liked] : []),
            ...playlistsApi.playlists,
          ]}
          onAddToPlaylist={handleAddToPlaylist}
          onBulkAddToPlaylist={handleBulkAddToPlaylist}
          onDeleteTrack={handleDeleteTrack}
          onBulkDeleteTracks={handleBulkDeleteTracks}
          onReorder={handleReorderLibraryTracks}
          onOpenArtist={openArtistFromList}
        />
      )
    } else {
      mainContent = (
        <AlbumsPage
          tracks={library.tracks}
          onOpenAlbum={(id) => openAlbum(id, 'albums')}
          onImportFolder={() => void library.importFolder()}
        />
      )
    }
  } else if (nav === 'search') {
    mainContent = (
      <SearchPage
        query={searchQuery}
        tracks={library.tracks}
        playlists={[
          ...(playlistsApi.liked ? [playlistsApi.liked] : []),
          ...playlistsApi.playlists,
        ]}
        onPlay={playTrack}
        onAddToQueue={addToQueue}
        onAddToPlaylist={handleAddToPlaylist}
        onBulkAddToPlaylist={handleBulkAddToPlaylist}
        onDeleteTrack={handleDeleteTrack}
        onBulkDeleteTracks={handleBulkDeleteTracks}
        onOpenArtist={openArtistFromSearch}
        onOpenAlbum={(albumId) => openAlbumFromSearch(albumId)}
        onOpenPlaylist={openPlaylistFromSearch}
        onLibraryRefresh={() => library.refresh()}
      />
    )
  } else if (nav === 'artists') {
    if (currentAlbum && currentArtist) {
      mainContent = (
        <AlbumDetailPage
          album={currentAlbum}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          playlists={[
            ...(playlistsApi.liked ? [playlistsApi.liked] : []),
            ...playlistsApi.playlists,
          ]}
          onAddToPlaylist={handleAddToPlaylist}
          onBulkAddToPlaylist={handleBulkAddToPlaylist}
          onDeleteTrack={handleDeleteTrack}
          onBulkDeleteTracks={handleBulkDeleteTracks}
          onReorder={handleReorderLibraryTracks}
          onOpenArtist={openArtistFromList}
        />
      )
    } else if (currentAlbum) {
      mainContent = (
        <AlbumDetailPage
          album={currentAlbum}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          playlists={[
            ...(playlistsApi.liked ? [playlistsApi.liked] : []),
            ...playlistsApi.playlists,
          ]}
          onAddToPlaylist={handleAddToPlaylist}
          onBulkAddToPlaylist={handleBulkAddToPlaylist}
          onDeleteTrack={handleDeleteTrack}
          onBulkDeleteTracks={handleBulkDeleteTracks}
          onReorder={handleReorderLibraryTracks}
          onOpenArtist={openArtistFromList}
        />
      )
    } else if (currentArtist) {
      mainContent = (
        <ArtistDetailPage
          artist={currentArtist}
          onPlay={playTrack}
          onAddToQueue={addToQueue}
          onOpenAlbum={(albumId) => openAlbum(albumId, 'artist')}
          onOpenArtist={openArtist}
          playlists={[
            ...(playlistsApi.liked ? [playlistsApi.liked] : []),
            ...playlistsApi.playlists,
          ]}
          onAddToPlaylist={handleAddToPlaylist}
          onBulkAddToPlaylist={handleBulkAddToPlaylist}
          onDeleteTrack={handleDeleteTrack}
          onBulkDeleteTracks={handleBulkDeleteTracks}
          onReorder={handleReorderLibraryTracks}
        />
      )
    } else {
      mainContent = (
        <ArtistsPage
          tracks={library.tracks}
          onOpenArtist={openArtist}
          onImportFolder={() => void library.importFolder()}
        />
      )
    }
  }

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground flex h-dvh min-h-0 flex-col overflow-hidden">
        <SidebarProvider className="relative min-h-0 w-full flex-1 overflow-hidden">
          <AppSidebar
            active={nav}
            activePlaylistId={selectedPlaylistId}
            search={searchDraft}
            playlists={playlistsApi.playlists}
            onSearchChange={setSearchDraft}
            onSearchSubmit={handleSearchSubmit}
            onNavigate={handleNavigate}
            onCreatePlaylist={() => setCreateOpen(true)}
          />
          <SidebarInset
            className={
              showDetailBackdrop
                ? 'relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-transparent'
                : 'flex min-h-0 min-w-0 flex-col overflow-hidden'
            }
          >
            {showDetailBackdrop ? (
              <DetailBlurBackground
                coverPath={detailBackdropCover}
                className="z-0"
              />
            ) : null}
            <header
              className={cn(
                'app-drag relative z-20 flex h-10 shrink-0 items-center gap-2 bg-transparent pr-1 pl-3',
                'transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                lyricsOpen && 'pointer-events-none opacity-0'
              )}
              aria-hidden={lyricsOpen}
            >
              <div className="app-no-drag flex shrink-0 items-center gap-0.5">
                <SidebarTrigger />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.back')}
                  disabled={!canGoBack}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={handleNavBack}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.forward')}
                  disabled={!canGoForward}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={handleNavForward}
                >
                  <ArrowRightIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.refresh')}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleNavRefresh}
                >
                  <RefreshCwIcon />
                </Button>
              </div>
              <div className="min-w-0 flex-1" />
              <div className="app-no-drag shrink-0">
                <WindowControls />
              </div>
            </header>

            <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
              <div className="absolute inset-0 min-h-0 overflow-hidden">
                {mainContent}
              </div>

              <PlayerBar
                current={player.current}
                queue={player.queue}
                playing={player.playing}
                currentTime={player.currentTime}
                duration={player.duration}
                volume={player.volume}
                muted={player.muted}
                shuffle={player.shuffle}
                repeatMode={player.repeatMode}
                liked={currentLiked}
                onLyricsOpenChange={setLyricsOpen}
                onToggle={() => void player.toggle()}
                onSeek={player.seek}
                onVolume={player.setVolume}
                onMuteToggle={() => {
                  if (player.muted) {
                    player.setMuted(false)
                    if (player.volume === 0) player.setVolume(0.85)
                  } else {
                    player.setMuted(true)
                  }
                }}
                onPrevious={() => void player.playPrevious()}
                onNext={() => void player.playNext()}
                onToggleShuffle={player.toggleShuffle}
                onCycleRepeat={player.cycleRepeatMode}
                onPlayFromQueue={(track) => void player.playTrack(track)}
                onRemoveFromQueue={player.removeFromQueue}
                onClearQueue={player.clearQueue}
                onToggleLiked={() => {
                  void (async () => {
                    if (
                      !player.current ||
                      !playlistsApi.liked ||
                      isPluginTrack(player.current)
                    ) {
                      return
                    }
                    if (currentLiked) {
                      await playlistsApi.removeTrackFromPlaylist(
                        playlistsApi.liked.id,
                        player.current.id
                      )
                      setCurrentLiked(false)
                    } else {
                      await playlistsApi.addTrackToPlaylist(
                        playlistsApi.liked.id,
                        player.current.id
                      )
                      setCurrentLiked(true)
                    }
                    await refreshCurrentPlaylist()
                  })()
                }}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>

        <CreatePlaylistDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (name, description) => {
            const created = await playlistsApi.createPlaylist(name, description)
            setSelectedPlaylistId(created.id)
            setNav('playlist')
          }}
        />
      </div>
    </TooltipProvider>
  )
}
