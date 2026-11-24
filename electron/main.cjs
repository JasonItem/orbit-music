const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { parseFile, parseStream } = require('music-metadata')
const {
  initDatabase,
  listTracks,
  getTrack,
  upsertTrack,
  removeTrack,
  bumpPlay,
  libraryStats,
  listPlaylists,
  getPlaylist,
  getLikedPlaylist,
  listPlaylistTracks,
  createPlaylist,
  deletePlaylist,
  renamePlaylist,
  reorderTracks,
  reorderPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  isTrackInPlaylist,
  closeDatabase,
} = require('./db.cjs')
const {
  initCoversDir,
  resolveCoverPath,
  resolveLyrics,
  loadLyricsForTrack,
  nameOfFile,
  cleanTag,
  resolveMediaMime,
  albumNameFromFolder,
  findAlbumFolderCover,
} = require('./media-assets.cjs')
const pluginHost = require('./plugins/host.cjs')

// Align with MyGo local walk + Chromium-playable extras.
const AUDIO_EXTENSIONS = [
  'mp3',
  'flac',
  'ogg',
  'opus',
  'wav',
  'aac',
  'm4a',
  'mp4',
  'wma',
  'aiff',
  'aif',
  'webm',
]
const AUDIO_EXT = new Set(AUDIO_EXTENSIONS.map((ext) => `.${ext}`))

/** @type {BrowserWindow | null} */
let mainWindow = null
const isDev = !app.isPackaged

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
}

function serveLocalFile(filePath, request) {
  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 })
  }
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) {
    return new Response('Not found', { status: 404 })
  }

  const mime = resolveMediaMime(filePath)
  const size = stat.size
  const range = request.headers.get('Range')

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range)
    if (match) {
      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Number(match[2]) : size - 1
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end >= start &&
        start < size
      ) {
        const clippedEnd = Math.min(end, size - 1)
        const chunk = Buffer.alloc(clippedEnd - start + 1)
        const fd = fs.openSync(filePath, 'r')
        try {
          fs.readSync(fd, chunk, 0, chunk.length, start)
        } finally {
          fs.closeSync(fd)
        }
        return new Response(chunk, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Length': String(chunk.length),
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${clippedEnd}/${size}`,
            'Cache-Control': 'no-cache',
          },
        })
      }
    }
  }

  const data = fs.readFileSync(filePath)
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    },
  })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

function createWindow() {
  const iconPath = path.join(
    __dirname,
    isDev ? '../public/orbit-music-icon.png' : '../dist/orbit-music-icon.png'
  )

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Orbit Music',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-changed', false)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function walkAudioFiles(rootDir) {
  /** @type {string[]} */
  const files = []
  const stack = [rootDir]
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const name = entry.name
      // MyGo: skip hidden files/folders such as macOS ._song.mp3
      if (name.startsWith('.')) continue
      const full = path.join(current, name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      if (!AUDIO_EXT.has(path.extname(name).toLowerCase())) continue
      try {
        const stat = fs.statSync(full)
        if (!stat.isFile() || stat.size === 0) continue
      } catch {
        continue
      }
      files.push(full)
    }
  }
  return files
}

async function parseWithHint(filePath, mimeType, options) {
  const size = fs.statSync(filePath).size
  if (mimeType) {
    return parseStream(fs.createReadStream(filePath), { mimeType, size }, options)
  }
  return parseFile(filePath, options)
}

async function readAudioMeta(filePath) {
  const sniffed = resolveMediaMime(filePath)
  const attempts = [
    { mimeType: sniffed, options: { duration: true } },
    {
      mimeType: sniffed,
      options: { duration: true, skipCovers: true, skipPostHeaders: true },
    },
    // Extension-based fallback when sniff/hint disagrees with a real container.
    { mimeType: null, options: { duration: true, skipCovers: true } },
  ]

  let lastError = null
  for (const attempt of attempts) {
    try {
      return await parseWithHint(filePath, attempt.mimeType, attempt.options)
    } catch (error) {
      lastError = error
    }
  }
  console.warn('Tag parse failed, using filename fallback:', filePath, lastError)
  return null
}

async function upsertFromFile(filePath) {
  const fromName = nameOfFile(filePath)
  const meta = await readAudioMeta(filePath)
  const common = meta?.common || {}
  const format = meta?.format || {}
  const title =
    cleanTag(common.title) || fromName.title || path.parse(filePath).name
  const artist =
    cleanTag(common.artist) ||
    cleanTag(common.albumartist) ||
    fromName.artist ||
    'Unknown Artist'
  const album =
    cleanTag(common.album) || albumNameFromFolder(filePath) || 'Unknown Album'
  const albumArtist = cleanTag(common.albumartist)
  const folderCoverPath = findAlbumFolderCover(path.dirname(filePath))
  const coverPath = resolveCoverPath(filePath, common.picture) || folderCoverPath
  const lyrics = resolveLyrics(filePath, common.lyrics)
  return upsertTrack({
    path: filePath,
    title,
    artist,
    album,
    album_artist: albumArtist,
    duration: Number(format.duration) > 0 ? Number(format.duration) : 0,
    bitrate: format.bitrate ? Math.round(format.bitrate) : null,
    sample_rate: format.sampleRate || null,
    year: common.year || null,
    genre: common.genre?.[0] || null,
    track_no: common.track?.no || null,
    cover_path: coverPath || null,
    folder_cover_path: folderCoverPath || '',
    lyrics_path: lyrics.lyricsPath,
    lyrics_text: lyrics.lyricsText,
  })
}

async function importPaths(filePaths) {
  const results = []
  let done = 0
  for (const filePath of filePaths) {
    try {
      results.push(await upsertFromFile(filePath))
    } catch (error) {
      console.error('Failed to import', filePath, error)
    }
    done += 1
    mainWindow?.webContents.send('library:importProgress', {
      done,
      total: filePaths.length,
    })
  }
  return results
}

/** Re-read tags for incomplete imports (duration / album folder / covers). */
async function repairTrackMeta() {
  const rows = listTracks({ limit: 5000, offset: 0 }).tracks || []
  const broken = rows.filter((t) => {
    if (!t.path) return false
    if (!(Number(t.duration) > 0)) return true
    if (!t.album || t.album === 'Unknown Album') return true
    // null = column never backfilled; '' = scanned but no cover.jpg
    if (t.folder_cover_path == null) return true
    // Drop old embedded/per-track covers; only folder cover.jpg is valid.
    if (
      t.cover_path &&
      !/[/\\]cover\.(jpe?g|png)$/i.test(String(t.cover_path))
    ) {
      return true
    }
    return false
  })
  let fixed = 0
  for (const track of broken) {
    try {
      if (!fs.existsSync(track.path)) continue
      await upsertFromFile(track.path)
      fixed += 1
    } catch (error) {
      console.warn('Failed to repair track meta', track.path, error)
    }
  }
  if (fixed > 0) {
    console.log(`Repaired metadata for ${fixed} track(s)`)
  }
  return fixed
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    }
    mainWindow.maximize()
    return true
  })
  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
  ipcMain.handle('window:isFullscreen', () => mainWindow?.isFullScreen() ?? false)
  ipcMain.handle('window:toggleFullscreen', () => {
    if (!mainWindow) return false
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
  })

  ipcMain.handle('library:pickFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入音乐文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '音频文件', extensions: AUDIO_EXTENSIONS },
        { name: '所有文件', extensions: ['*'] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const files = result.filePaths.filter((filePath) =>
      AUDIO_EXT.has(path.extname(filePath).toLowerCase())
    )
    return importPaths(files.length ? files : result.filePaths)
  })

  ipcMain.handle('library:pickFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入音乐文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const files = walkAudioFiles(result.filePaths[0])
    return importPaths(files)
  })

  ipcMain.handle('library:list', (_event, opts) => listTracks(opts))
  ipcMain.handle('library:get', (_event, id) => getTrack(id))
  ipcMain.handle('library:remove', (_event, payload) => {
    if (typeof payload === 'number') return removeTrack(payload)
    return removeTrack(payload?.id, { deleteFile: Boolean(payload?.deleteFile) })
  })
  ipcMain.handle('library:bumpPlay', (_event, id) => bumpPlay(id))
  ipcMain.handle('library:stats', () => libraryStats())
  ipcMain.handle('library:playlists', (_event, opts) => listPlaylists(opts))
  ipcMain.handle('library:playlistGet', (_event, id) => getPlaylist(id))
  ipcMain.handle('library:playlistLiked', () => getLikedPlaylist())
  ipcMain.handle('library:playlistTracks', (_event, id) =>
    listPlaylistTracks(id)
  )
  ipcMain.handle('library:playlistCreate', (_event, payload) =>
    createPlaylist(payload?.name, payload?.description)
  )
  ipcMain.handle('library:playlistDelete', (_event, id) => deletePlaylist(id))
  ipcMain.handle('library:playlistRename', (_event, payload) =>
    renamePlaylist(payload?.id, payload?.name, payload?.description)
  )
  ipcMain.handle('library:reorderTracks', (_event, trackIds) =>
    reorderTracks(trackIds)
  )
  ipcMain.handle('library:playlistReorderTracks', (_event, payload) =>
    reorderPlaylistTracks(payload?.playlistId, payload?.trackIds)
  )
  ipcMain.handle('library:playlistAddTrack', (_event, payload) =>
    addTrackToPlaylist(payload?.playlistId, payload?.trackId)
  )
  ipcMain.handle('library:playlistRemoveTrack', (_event, payload) =>
    removeTrackFromPlaylist(payload?.playlistId, payload?.trackId)
  )
  ipcMain.handle('library:playlistHasTrack', (_event, payload) =>
    isTrackInPlaylist(payload?.playlistId, payload?.trackId)
  )
  ipcMain.handle('media:url', (_event, filePath) => {
    if (!filePath || typeof filePath !== 'string') return null
    return `media://local/?path=${encodeURIComponent(filePath)}`
  })
  ipcMain.handle('library:lyrics', (_event, trackId) => {
    const track = getTrack(trackId)
    if (!track) return { lrc: '' }
    const lrc = loadLyricsForTrack(track.path, track.lyrics_text)
    return { lrc: lrc || '' }
  })

  ipcMain.handle('plugins:list', () => pluginHost.listPlugins())
  ipcMain.handle('plugins:reload', () => pluginHost.reloadAll())
  ipcMain.handle('plugins:getDownloadDir', () => pluginHost.getDownloadDir())
  ipcMain.handle('plugins:setDownloadDir', async (_event, dir) => {
    if (dir && typeof dir === 'string') {
      return pluginHost.setDownloadDir(dir)
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择插件下载目录',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return pluginHost.getDownloadDir()
    return pluginHost.setDownloadDir(result.filePaths[0])
  })
  ipcMain.handle('plugins:openFolder', () => pluginHost.openPluginsFolder())
  ipcMain.handle('plugins:installFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择插件文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const plugin = await pluginHost.installFromPath(result.filePaths[0])
    return pluginHost.listPlugins().find((p) => p.id === plugin?.id) || null
  })
  ipcMain.handle('plugins:installZip', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择插件 zip',
      properties: ['openFile'],
      filters: [
        { name: 'Plugin ZIP', extensions: ['zip'] },
        { name: 'All', extensions: ['*'] },
      ],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const plugin = await pluginHost.installFromZip(result.filePaths[0])
    return pluginHost.listPlugins().find((p) => p.id === plugin?.id) || null
  })
  ipcMain.handle('plugins:uninstall', async (_event, pluginId) => {
    await pluginHost.uninstall(pluginId)
    return true
  })
  ipcMain.handle('plugins:setEnabled', async (_event, payload) => {
    const plugin = await pluginHost.setEnabled(
      payload?.pluginId,
      Boolean(payload?.enabled)
    )
    return pluginHost.listPlugins().find((p) => p.id === plugin?.id) || null
  })
  ipcMain.handle('plugins:getConfig', (_event, pluginId) =>
    pluginHost.getConfig(pluginId)
  )
  ipcMain.handle('plugins:setConfig', (_event, payload) =>
    pluginHost.setConfig(payload?.pluginId, payload?.config)
  )
  ipcMain.handle('plugins:search', async (_event, payload) => {
    const songs = await pluginHost.searchAll(payload?.query, {
      limit: payload?.limit,
      offset: payload?.offset,
    })
    return songs.map((song) => pluginHost.onlineSongToTrack(song))
  })
  ipcMain.handle('plugins:getDetail', async (_event, payload) => {
    let pluginId = payload?.pluginId
    let sourceId = payload?.sourceId
    if ((!pluginId || !sourceId) && payload?.path) {
      const parsed = pluginHost.parsePluginPath(payload.path)
      if (parsed) {
        pluginId = parsed.pluginId
        sourceId = parsed.sourceId
      }
    }
    const song = await pluginHost.getSongDetail(pluginId, sourceId)
    return song ? pluginHost.onlineSongToTrack(song) : null
  })
  ipcMain.handle('plugins:getLyrics', async (_event, payload) => {
    let pluginId = payload?.pluginId
    let sourceId = payload?.sourceId
    if ((!pluginId || !sourceId) && payload?.path) {
      const parsed = pluginHost.parsePluginPath(payload.path)
      if (parsed) {
        pluginId = parsed.pluginId
        sourceId = parsed.sourceId
      }
    }
    try {
      const song = await pluginHost.getSongDetail(pluginId, sourceId)
      return { lrc: song?.lyrics || '' }
    } catch (error) {
      console.warn('plugins:getLyrics failed', error)
      return { lrc: '' }
    }
  })
  ipcMain.handle('plugins:getPlayUrl', async (_event, payload) => {
    let pluginId = payload?.pluginId
    let sourceId = payload?.sourceId
    if ((!pluginId || !sourceId) && payload?.path) {
      const parsed = pluginHost.parsePluginPath(payload.path)
      if (parsed) {
        pluginId = parsed.pluginId
        sourceId = parsed.sourceId
      }
    }
    return pluginHost.getPlayUrl(pluginId, sourceId, payload?.quality)
  })
  ipcMain.handle('plugins:download', async (_event, payload) => {
    let pluginId = payload?.pluginId
    let sourceId = payload?.sourceId
    if ((!pluginId || !sourceId) && payload?.path) {
      const parsed = pluginHost.parsePluginPath(payload.path)
      if (parsed) {
        pluginId = parsed.pluginId
        sourceId = parsed.sourceId
      }
    }
    const result = await pluginHost.downloadSong(
      pluginId,
      sourceId,
      payload?.quality
    )
    return result.track
  })
}

if (gotSingleInstanceLock) {
  app.whenReady().then(async () => {
    const userData = app.getPath('userData')
    initDatabase(userData)
    initCoversDir(userData)

    protocol.handle('media', async (request) => {
      try {
        const url = new URL(request.url)
        const filePath = url.searchParams.get('path')
        if (!filePath) return new Response('Missing path', { status: 400 })
        return serveLocalFile(filePath, request)
      } catch (error) {
        console.error(error)
        return new Response('Not found', { status: 404 })
      }
    })

    registerIpc()
    try {
      await pluginHost.initPlugins(userData, {
        importTrack: (filePath) => upsertFromFile(filePath),
        sendProgress: (payload) => {
          mainWindow?.webContents.send('plugins:downloadProgress', payload)
        },
      })
    } catch (error) {
      console.warn('Plugin host init failed', error)
    }
    try {
      await repairTrackMeta()
    } catch (error) {
      console.warn('Track meta repair skipped', error)
    }
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    closeDatabase()
    if (process.platform !== 'darwin') app.quit()
  })
}
