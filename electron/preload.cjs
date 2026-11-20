const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('musicApp', {
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  windowIsFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  windowToggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  onFullscreenChanged: (callback) => {
    const listener = (_event, value) => callback(Boolean(value))
    ipcRenderer.on('window:fullscreen-changed', listener)
    return () =>
      ipcRenderer.removeListener('window:fullscreen-changed', listener)
  },

  pickMusicFiles: () => ipcRenderer.invoke('library:pickFiles'),
  pickMusicFolder: () => ipcRenderer.invoke('library:pickFolder'),
  listTracks: (opts) => ipcRenderer.invoke('library:list', opts),
  getTrack: (id) => ipcRenderer.invoke('library:get', id),
  removeTrack: (id, options) =>
    ipcRenderer.invoke('library:remove', {
      id,
      deleteFile: Boolean(options?.deleteFile),
    }),
  bumpPlay: (id) => ipcRenderer.invoke('library:bumpPlay', id),
  libraryStats: () => ipcRenderer.invoke('library:stats'),
  listPlaylists: (opts) => ipcRenderer.invoke('library:playlists', opts),
  getPlaylist: (id) => ipcRenderer.invoke('library:playlistGet', id),
  getLikedPlaylist: () => ipcRenderer.invoke('library:playlistLiked'),
  listPlaylistTracks: (id) => ipcRenderer.invoke('library:playlistTracks', id),
  createPlaylist: (name, description) =>
    ipcRenderer.invoke('library:playlistCreate', { name, description }),
  deletePlaylist: (id) => ipcRenderer.invoke('library:playlistDelete', id),
  renamePlaylist: (id, name, description) =>
    ipcRenderer.invoke('library:playlistRename', { id, name, description }),
  reorderTracks: (trackIds) =>
    ipcRenderer.invoke('library:reorderTracks', trackIds),
  reorderPlaylistTracks: (playlistId, trackIds) =>
    ipcRenderer.invoke('library:playlistReorderTracks', {
      playlistId,
      trackIds,
    }),
  addTrackToPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('library:playlistAddTrack', { playlistId, trackId }),
  removeTrackFromPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('library:playlistRemoveTrack', {
      playlistId,
      trackId,
    }),
  isTrackInPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('library:playlistHasTrack', { playlistId, trackId }),
  mediaUrl: (filePath) => ipcRenderer.invoke('media:url', filePath),
  getLyrics: (trackId) => ipcRenderer.invoke('library:lyrics', trackId),

  onImportProgress: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('library:importProgress', listener)
    return () => ipcRenderer.removeListener('library:importProgress', listener)
  },
})
