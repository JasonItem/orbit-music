import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { playlistDisplayName, t } from '@/i18n'
import type { Playlist, Track } from '@/types/music'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [liked, setLiked] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!window.musicApp) {
      setPlaylists([])
      setLiked(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [all, likedPlaylist] = await Promise.all([
        window.musicApp.listPlaylists({ includeLiked: true }),
        window.musicApp.getLikedPlaylist(),
      ])
      setLiked(likedPlaylist)
      setPlaylists(all.filter((item) => item.kind !== 'liked'))
    } catch {
      setPlaylists([])
      setLiked(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createPlaylist = useCallback(
    async (name: string, description = '') => {
      if (!window.musicApp?.createPlaylist) {
        throw new Error(t('toast.restartRequired'))
      }
      const playlist = await window.musicApp.createPlaylist(name, description)
      toast.success(t('toast.playlistCreated'))
      await refresh()
      return playlist
    },
    [refresh]
  )

  const deletePlaylist = useCallback(
    async (id: number) => {
      if (!window.musicApp) throw new Error(t('toast.apiUnavailable'))
      await window.musicApp.deletePlaylist(id)
      toast.success(t('toast.playlistDeleted'))
      await refresh()
    },
    [refresh]
  )

  const renamePlaylist = useCallback(
    async (id: number, name: string, description?: string) => {
      if (!window.musicApp?.renamePlaylist) {
        throw new Error(t('toast.restartRequired'))
      }
      const playlist = await window.musicApp.renamePlaylist(
        id,
        name,
        description
      )
      toast.success(t('toast.playlistRenamed'))
      await refresh()
      return playlist
    },
    [refresh]
  )

  const loadPlaylistTracks = useCallback(async (id: number) => {
    if (!window.musicApp) return [] as Track[]
    return window.musicApp.listPlaylistTracks(id)
  }, [])

  const getPlaylist = useCallback(async (id: number) => {
    if (!window.musicApp) return null
    return window.musicApp.getPlaylist(id)
  }, [])

  const addTrackToPlaylist = useCallback(
    async (playlistId: number, trackId: number) => {
      if (!window.musicApp) throw new Error(t('toast.apiUnavailable'))
      const playlist = await window.musicApp.addTrackToPlaylist(
        playlistId,
        trackId
      )
      toast.success(
        t('toast.addedToPlaylist', { name: playlistDisplayName(playlist) })
      )
      await refresh()
      return playlist
    },
    [refresh]
  )

  const addTracksToPlaylist = useCallback(
    async (playlistId: number, trackIds: number[]) => {
      if (!window.musicApp) throw new Error(t('toast.apiUnavailable'))
      if (!trackIds.length) return null
      let playlist = null
      for (const trackId of trackIds) {
        playlist = await window.musicApp.addTrackToPlaylist(playlistId, trackId)
      }
      const name = playlist
        ? playlistDisplayName(playlist)
        : t('common.playlist')
      toast.success(
        trackIds.length === 1
          ? t('toast.addedToPlaylist', { name })
          : t('toast.addedTracksToPlaylist', {
              count: trackIds.length,
              name,
            })
      )
      await refresh()
      return playlist
    },
    [refresh]
  )

  const removeTrackFromPlaylist = useCallback(
    async (playlistId: number, trackId: number) => {
      if (!window.musicApp) throw new Error(t('toast.apiUnavailable'))
      const playlist = await window.musicApp.removeTrackFromPlaylist(
        playlistId,
        trackId
      )
      toast.success(
        t('toast.removedFromPlaylist', {
          name: playlistDisplayName(playlist),
        })
      )
      await refresh()
      return playlist
    },
    [refresh]
  )

  const removeTracksFromPlaylist = useCallback(
    async (playlistId: number, trackIds: number[]) => {
      if (!window.musicApp) throw new Error(t('toast.apiUnavailable'))
      if (!trackIds.length) return null
      let playlist = null
      for (const trackId of trackIds) {
        playlist = await window.musicApp.removeTrackFromPlaylist(
          playlistId,
          trackId
        )
      }
      const name = playlist
        ? playlistDisplayName(playlist)
        : t('common.playlist')
      toast.success(
        trackIds.length === 1
          ? t('toast.removedFromPlaylist', { name })
          : t('toast.removedTracksFromPlaylist', {
              count: trackIds.length,
              name,
            })
      )
      await refresh()
      return playlist
    },
    [refresh]
  )

  return {
    playlists,
    liked,
    loading,
    refresh,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    loadPlaylistTracks,
    getPlaylist,
    addTrackToPlaylist,
    addTracksToPlaylist,
    removeTrackFromPlaylist,
    removeTracksFromPlaylist,
    reorderPlaylistTracks: useCallback(
      async (playlistId: number, trackIds: number[]) => {
        if (!window.musicApp?.reorderPlaylistTracks) {
          throw new Error(t('toast.reorderRestartRequired'))
        }
        return window.musicApp.reorderPlaylistTracks(playlistId, trackIds)
      },
      []
    ),
  }
}
