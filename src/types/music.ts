export interface Track {
  id: number
  path: string
  title: string
  artist: string
  album: string
  duration: number
  bitrate: number | null
  sample_rate: number | null
  year: number | null
  genre: string | null
  track_no: number | null
  album_artist?: string | null
  cover_path: string | null
  folder_cover_path?: string | null
  lyrics_path: string | null
  lyrics_text: string | null
  added_at: string
  play_count: number
  last_played_at: string | null
  /** Local file missing or moved */
  missing?: boolean
  /** Online track from a plugin (not in local SQLite) */
  online?: boolean
  pluginId?: string
  sourceId?: string
}

export interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  dir: string
  capabilityNames: string[]
  enabled: boolean
  loaded: boolean
  error: string | null
  configSchema: Record<string, unknown> | null
}

export interface PluginPlayUrl {
  url: string
  expiresAt: number | null
  quality: string | null
  mimeType: string | null
}

export interface PluginDownloadProgress {
  pluginId: string
  sourceId: string
  phase: string
  loaded?: number
  total?: number | null
}

export function isPluginTrack(
  track: Pick<Track, 'path' | 'online'> | null | undefined
): boolean {
  if (!track) return false
  if (track.online) return true
  return Boolean(track.path?.startsWith('orbit-plugin://'))
}

export function parsePluginTrackPath(
  filePath: string
): { pluginId: string; sourceId: string } | null {
  if (!filePath?.startsWith('orbit-plugin://')) return null
  const rest = filePath.slice('orbit-plugin://'.length)
  const slash = rest.indexOf('/')
  if (slash < 0) return null
  try {
    const pluginId = decodeURIComponent(rest.slice(0, slash))
    const sourceId = decodeURIComponent(rest.slice(slash + 1))
    if (!pluginId || !sourceId) return null
    return { pluginId, sourceId }
  } catch {
    return null
  }
}

export interface Playlist {
  id: number
  name: string
  description: string
  kind: 'liked' | 'user' | string
  created_at: string
  track_count: number
  cover_path?: string | null
}

export interface LibraryStats {
  tracks: number
  artists: number
  albums: number
  duration: number
}

export type NavId =
  | 'songs'
  | 'albums'
  | 'artists'
  | 'liked'
  | 'playlist'
  | 'search'

export type NowPlayingTab =
  | 'lyrics'
  | 'rhythm'
  | 'queue'
  | 'pick'
  | 'comments'

export interface MusicAppApi {
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<boolean>
  windowIsFullscreen?: () => Promise<boolean>
  windowToggleFullscreen?: () => Promise<boolean>
  onFullscreenChanged?: (callback: (fullscreen: boolean) => void) => () => void
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  pickMusicFiles: () => Promise<Track[]>
  pickMusicFolder: () => Promise<Track[]>
  listTracks: (opts?: {
    search?: string
    limit?: number
    offset?: number
  }) => Promise<{ tracks: Track[]; total: number }>
  getTrack: (id: number) => Promise<Track | null>
  removeTrack: (
    id: number,
    options?: { deleteFile?: boolean }
  ) => Promise<{ ok: boolean; deletedFile: boolean; fileError?: string }>
  bumpPlay: (id: number) => Promise<Track | null>
  libraryStats: () => Promise<LibraryStats>
  listPlaylists: (opts?: { includeLiked?: boolean }) => Promise<Playlist[]>
  getPlaylist: (id: number) => Promise<Playlist | null>
  getLikedPlaylist: () => Promise<Playlist | null>
  listPlaylistTracks: (id: number) => Promise<Track[]>
  createPlaylist: (name: string, description?: string) => Promise<Playlist>
  deletePlaylist: (id: number) => Promise<boolean>
  renamePlaylist: (
    id: number,
    name: string,
    description?: string
  ) => Promise<Playlist>
  reorderTracks: (trackIds: number[]) => Promise<Track[]>
  reorderPlaylistTracks: (
    playlistId: number,
    trackIds: number[]
  ) => Promise<Track[]>
  addTrackToPlaylist: (
    playlistId: number,
    trackId: number
  ) => Promise<Playlist>
  removeTrackFromPlaylist: (
    playlistId: number,
    trackId: number
  ) => Promise<Playlist>
  isTrackInPlaylist: (playlistId: number, trackId: number) => Promise<boolean>
  mediaUrl: (filePath: string) => Promise<string | null>
  getLyrics: (trackId: number) => Promise<{ lrc: string }>
  onImportProgress: (
    callback: (payload: { done: number; total: number }) => void
  ) => () => void
  plugins?: {
    list: () => Promise<PluginInfo[]>
    reload: () => Promise<PluginInfo[]>
    getDownloadDir: () => Promise<string>
    setDownloadDir: (dir?: string) => Promise<string>
    openFolder: () => Promise<string>
    installFolder: () => Promise<PluginInfo | null>
    installZip: () => Promise<PluginInfo | null>
    uninstall: (pluginId: string) => Promise<boolean>
    setEnabled: (
      pluginId: string,
      enabled: boolean
    ) => Promise<PluginInfo | null>
    getConfig: (pluginId: string) => Promise<Record<string, unknown>>
    setConfig: (
      pluginId: string,
      config: Record<string, unknown>
    ) => Promise<Record<string, unknown>>
    search: (
      query: string,
      opts?: { limit?: number; offset?: number }
    ) => Promise<Track[]>
    getDetail: (
      pluginIdOrPayload:
        | string
        | { pluginId?: string; sourceId?: string; path?: string },
      sourceId?: string
    ) => Promise<Track | null>
    getLyrics: (payload: {
      pluginId?: string
      sourceId?: string
      path?: string
    }) => Promise<{ lrc: string }>
    getPlayUrl: (payload: {
      pluginId?: string
      sourceId?: string
      path?: string
      quality?: string
    }) => Promise<PluginPlayUrl | null>
    download: (payload: {
      pluginId?: string
      sourceId?: string
      path?: string
      quality?: string
    }) => Promise<Track>
    onDownloadProgress: (
      callback: (payload: PluginDownloadProgress) => void
    ) => () => void
  }
}

declare global {
  interface Window {
    musicApp?: MusicAppApi
  }
}

export {}
