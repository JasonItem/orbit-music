'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { shell } = require('electron')
const AdmZip = require('adm-zip')
const {
  listPlugins,
  getPlugin,
  setPlugin,
  removePlugin,
  clearPlugins,
  pluginsWithCapability,
} = require('./registry.cjs')
const { saveOnlineSong } = require('./download.cjs')

const ALLOWED_PLUGIN_EXTS = new Set([
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
])

/** @type {string} */
let pluginsRoot = ''
/** @type {string} */
let statePath = ''
/** @type {{ downloadDir: string; enabled: Record<string, boolean>; config: Record<string, Record<string, unknown>> }} */
let state = {
  downloadDir: '',
  enabled: {},
  config: {},
}
/** @type {((filePath: string) => Promise<unknown>) | null} */
let importTrackFn = null
/** @type {((payload: object) => void) | null} */
let progressSender = null

function defaultState(userData) {
  return {
    downloadDir: path.join(userData, 'downloads'),
    enabled: {},
    config: {},
  }
}

function loadState(userData) {
  statePath = path.join(userData, 'plugins-state.json')
  const base = defaultState(userData)
  try {
    if (fs.existsSync(statePath)) {
      const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'))
      state = {
        downloadDir:
          typeof raw.downloadDir === 'string' && raw.downloadDir
            ? raw.downloadDir
            : base.downloadDir,
        enabled:
          raw.enabled && typeof raw.enabled === 'object' ? raw.enabled : {},
        config: raw.config && typeof raw.config === 'object' ? raw.config : {},
      }
      return
    }
  } catch (error) {
    console.warn('Failed to load plugins-state.json', error)
  }
  state = base
  saveState()
}

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8')
}

function readManifest(dir) {
  const manifestPath = path.join(dir, 'orbit-plugin.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing orbit-plugin.json')
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new Error('Plugin manifest requires string id')
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(manifest.id)) {
    throw new Error('Invalid plugin id')
  }
  return {
    id: manifest.id,
    name: String(manifest.name || manifest.id),
    version: String(manifest.version || '0.0.0'),
    description: String(manifest.description || ''),
    author: String(manifest.author || ''),
    main: String(manifest.main || 'index.cjs'),
    capabilities: Array.isArray(manifest.capabilities)
      ? manifest.capabilities.map(String)
      : [],
    configSchema:
      manifest.configSchema && typeof manifest.configSchema === 'object'
        ? manifest.configSchema
        : null,
  }
}

function createHostApi(pluginId, pluginDir) {
  return {
    pluginId,
    pluginDir,
    getConfig() {
      return { ...(state.config[pluginId] || {}) }
    },
    setConfig(partial) {
      const next = {
        ...(state.config[pluginId] || {}),
        ...(partial && typeof partial === 'object' ? partial : {}),
      }
      state.config[pluginId] = next
      saveState()
      return { ...next }
    },
    async fetch(url, init) {
      return fetch(url, init)
    },
    log: {
      info: (...args) => console.log(`[plugin:${pluginId}]`, ...args),
      warn: (...args) => console.warn(`[plugin:${pluginId}]`, ...args),
      error: (...args) => console.error(`[plugin:${pluginId}]`, ...args),
    },
  }
}

function normalizeSong(pluginId, song) {
  if (!song || typeof song !== 'object') return null
  const sourceId = String(song.sourceId || song.id || '').trim()
  if (!sourceId) return null
  return {
    pluginId,
    sourceId,
    title: String(song.title || 'Unknown Title'),
    artist: String(song.artist || 'Unknown Artist'),
    album: song.album != null ? String(song.album) : '',
    duration: Number(song.duration) > 0 ? Number(song.duration) : 0,
    coverUrl: song.coverUrl ? String(song.coverUrl) : '',
    lyrics: song.lyrics != null ? String(song.lyrics) : '',
    qualityHints: Array.isArray(song.qualityHints)
      ? song.qualityHints.map(String)
      : [],
    extra:
      song.extra && typeof song.extra === 'object'
        ? /** @type {Record<string, unknown>} */ (song.extra)
        : {},
  }
}

/**
 * Stable negative id for online tracks (never collide with SQLite positive ids).
 * @param {string} pluginId
 * @param {string} sourceId
 */
function onlineTrackId(pluginId, sourceId) {
  const key = `${pluginId}\0${sourceId}`
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const positive = hash >>> 0
  return -Math.max(1, positive || 1)
}

function pluginPath(pluginId, sourceId) {
  return `orbit-plugin://${encodeURIComponent(pluginId)}/${encodeURIComponent(sourceId)}`
}

function parsePluginPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null
  if (!filePath.startsWith('orbit-plugin://')) return null
  const rest = filePath.slice('orbit-plugin://'.length)
  const slash = rest.indexOf('/')
  if (slash < 0) return null
  const pluginId = decodeURIComponent(rest.slice(0, slash))
  const sourceId = decodeURIComponent(rest.slice(slash + 1))
  if (!pluginId || !sourceId) return null
  return { pluginId, sourceId }
}

function onlineSongToTrack(song) {
  return {
    id: onlineTrackId(song.pluginId, song.sourceId),
    path: pluginPath(song.pluginId, song.sourceId),
    title: song.title,
    artist: song.artist,
    album: song.album || 'Unknown Album',
    duration: song.duration || 0,
    bitrate: null,
    sample_rate: null,
    year: null,
    genre: null,
    track_no: null,
    album_artist: song.artist,
    cover_path: song.coverUrl || null,
    folder_cover_path: null,
    lyrics_path: null,
    lyrics_text: song.lyrics || null,
    added_at: new Date().toISOString(),
    play_count: 0,
    last_played_at: null,
    online: true,
    pluginId: song.pluginId,
    sourceId: song.sourceId,
  }
}

async function activatePlugin(dir, manifest, enabled) {
  /** @type {import('./registry.cjs').PluginCapabilities} */
  const capabilities = {}
  const capabilityNames = []
  const host = createHostApi(manifest.id, dir)

  const entry = path.join(dir, manifest.main)
  if (!fs.existsSync(entry)) {
    throw new Error(`Missing entry: ${manifest.main}`)
  }

  // Clear require cache so reinstall/reload picks up changes
  try {
    delete require.cache[require.resolve(entry)]
  } catch {
    // ignore
  }

  // eslint-disable-next-line import/no-dynamic-require
  const mod = require(entry)
  const activate = typeof mod === 'function' ? mod : mod?.activate
  if (typeof activate !== 'function') {
    throw new Error('Plugin must export activate(ctx)')
  }

  const ctx = {
    ...host,
    registerCapabilities(caps) {
      if (!caps || typeof caps !== 'object') return
      for (const [name, fn] of Object.entries(caps)) {
        if (typeof fn !== 'function') continue
        capabilities[name] = fn
        capabilityNames.push(name)
      }
    },
  }

  await activate(ctx)

  setPlugin({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    dir,
    capabilityNames: [...new Set(capabilityNames)],
    enabled,
    loaded: true,
    error: null,
    capabilities,
    configSchema: manifest.configSchema || undefined,
  })
}

async function tryLoadPluginDir(dir) {
  let manifest
  try {
    manifest = readManifest(dir)
  } catch (error) {
    console.warn('Skip invalid plugin dir', dir, error)
    return
  }

  const enabled = state.enabled[manifest.id] !== false
  if (!(manifest.id in state.enabled)) {
    state.enabled[manifest.id] = true
    saveState()
  }

  if (!enabled) {
    setPlugin({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      dir,
      capabilityNames: manifest.capabilities || [],
      enabled: false,
      loaded: false,
      error: null,
      capabilities: {},
      configSchema: manifest.configSchema || undefined,
    })
    return
  }

  try {
    await activatePlugin(dir, manifest, true)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to load plugin ${manifest.id}`, error)
    setPlugin({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      dir,
      capabilityNames: manifest.capabilities || [],
      enabled: true,
      loaded: false,
      error: message,
      capabilities: {},
      configSchema: manifest.configSchema || undefined,
    })
  }
}

async function reloadAll() {
  clearPlugins()
  if (!fs.existsSync(pluginsRoot)) {
    fs.mkdirSync(pluginsRoot, { recursive: true })
    return listPlugins()
  }
  const entries = fs.readdirSync(pluginsRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    await tryLoadPluginDir(path.join(pluginsRoot, entry.name))
  }
  return listPlugins()
}

/**
 * @param {string} userData
 * @param {{ importTrack: (filePath: string) => Promise<unknown>; sendProgress?: (payload: object) => void }} hooks
 */
async function initPlugins(userData, hooks) {
  pluginsRoot = path.join(userData, 'plugins')
  fs.mkdirSync(pluginsRoot, { recursive: true })
  loadState(userData)
  fs.mkdirSync(state.downloadDir, { recursive: true })
  importTrackFn = hooks.importTrack
  progressSender = hooks.sendProgress || null
  await reloadAll()
}

function getPluginsRoot() {
  return pluginsRoot
}

function getDownloadDir() {
  return state.downloadDir
}

function setDownloadDir(dir) {
  if (!dir || typeof dir !== 'string') throw new Error('Invalid download dir')
  state.downloadDir = dir
  fs.mkdirSync(dir, { recursive: true })
  saveState()
  return state.downloadDir
}

function openPluginsFolder() {
  fs.mkdirSync(pluginsRoot, { recursive: true })
  return shell.openPath(pluginsRoot)
}

function copyPluginTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue
    const from = path.join(srcDir, entry.name)
    const to = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      copyPluginTree(from, to)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!ALLOWED_PLUGIN_EXTS.has(ext) && entry.name !== 'orbit-plugin.json') {
      continue
    }
    fs.copyFileSync(from, to)
  }
}

function assertSafeZipEntry(entryName, destRoot) {
  const normalized = path.normalize(entryName).replace(/^([/\\])+/, '')
  if (normalized.includes('..')) {
    throw new Error(`Unsafe zip entry: ${entryName}`)
  }
  const full = path.join(destRoot, normalized)
  if (!full.startsWith(path.resolve(destRoot))) {
    throw new Error(`Zip slip blocked: ${entryName}`)
  }
  return { normalized, full }
}

async function installFromPath(sourcePath) {
  const stat = fs.statSync(sourcePath)
  if (!stat.isDirectory()) {
    throw new Error('installFromPath expects a directory')
  }
  const manifest = readManifest(sourcePath)
  const dest = path.join(pluginsRoot, manifest.id)
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true })
  }
  copyPluginTree(sourcePath, dest)
  state.enabled[manifest.id] = true
  saveState()
  await tryLoadPluginDir(dest)
  return getPlugin(manifest.id)
}

async function installFromZip(zipPath) {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  const tmpRoot = path.join(
    pluginsRoot,
    `.install-tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
  fs.mkdirSync(tmpRoot, { recursive: true })
  try {
    for (const entry of entries) {
      if (entry.isDirectory) continue
      const { normalized, full } = assertSafeZipEntry(entry.entryName, tmpRoot)
      const ext = path.extname(normalized).toLowerCase()
      const base = path.basename(normalized)
      if (!ALLOWED_PLUGIN_EXTS.has(ext) && base !== 'orbit-plugin.json') {
        continue
      }
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, entry.getData())
    }

    // Support zip with orbit-plugin.json at root or one level down
    let pluginDir = tmpRoot
    if (!fs.existsSync(path.join(tmpRoot, 'orbit-plugin.json'))) {
      const children = fs
        .readdirSync(tmpRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
      let found = null
      for (const child of children) {
        const candidate = path.join(tmpRoot, child.name)
        if (fs.existsSync(path.join(candidate, 'orbit-plugin.json'))) {
          found = candidate
          break
        }
      }
      if (!found) throw new Error('Zip missing orbit-plugin.json')
      pluginDir = found
    }

    const manifest = readManifest(pluginDir)
    const dest = path.join(pluginsRoot, manifest.id)
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    fs.renameSync(pluginDir, dest)
    // tmpRoot may already be moved when manifest was at zip root
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    }
    state.enabled[manifest.id] = true
    saveState()
    await tryLoadPluginDir(dest)
    return getPlugin(manifest.id)
  } catch (error) {
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    }
    throw error
  }
}

async function uninstall(pluginId) {
  const plugin = getPlugin(pluginId)
  const dir = plugin?.dir || path.join(pluginsRoot, pluginId)
  removePlugin(pluginId)
  delete state.enabled[pluginId]
  delete state.config[pluginId]
  saveState()
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  return true
}

async function setEnabled(pluginId, enabled) {
  state.enabled[pluginId] = Boolean(enabled)
  saveState()
  const dir = path.join(pluginsRoot, pluginId)
  if (!fs.existsSync(dir)) {
    throw new Error('Plugin not found')
  }
  removePlugin(pluginId)
  await tryLoadPluginDir(dir)
  return getPlugin(pluginId)
}

function getConfig(pluginId) {
  return { ...(state.config[pluginId] || {}) }
}

function setConfig(pluginId, partial) {
  state.config[pluginId] = {
    ...(state.config[pluginId] || {}),
    ...(partial && typeof partial === 'object' ? partial : {}),
  }
  saveState()
  return getConfig(pluginId)
}

async function searchAll(query, opts = {}) {
  const q = String(query || '').trim()
  if (!q) return []
  const plugins = pluginsWithCapability('search')
  const results = []
  await Promise.all(
    plugins.map(async (plugin) => {
      try {
        const rows = await plugin.capabilities.search(q, opts)
        if (!Array.isArray(rows)) return
        for (const row of rows) {
          const song = normalizeSong(plugin.id, row)
          if (song) results.push(song)
        }
      } catch (error) {
        console.warn(`Plugin search failed: ${plugin.id}`, error)
      }
    })
  )
  return results
}

async function getSongDetail(pluginId, sourceId) {
  const plugin = getPlugin(pluginId)
  if (!plugin?.enabled || !plugin.loaded) throw new Error('Plugin unavailable')
  const fn = plugin.capabilities.getSongDetail
  if (typeof fn !== 'function') throw new Error('Plugin has no getSongDetail')
  const raw = await fn(sourceId)
  return normalizeSong(pluginId, raw)
}

async function getPlayUrl(pluginId, sourceId, quality) {
  const plugin = getPlugin(pluginId)
  if (!plugin?.enabled || !plugin.loaded) throw new Error('Plugin unavailable')
  const fn = plugin.capabilities.getPlayUrl
  if (typeof fn !== 'function') throw new Error('Plugin has no getPlayUrl')
  const result = await fn(sourceId, quality)
  if (!result?.url) return null
  return {
    url: String(result.url),
    expiresAt: result.expiresAt ? Number(result.expiresAt) : null,
    quality: result.quality ? String(result.quality) : null,
    mimeType: result.mimeType ? String(result.mimeType) : null,
  }
}

async function downloadSong(pluginId, sourceId, quality) {
  const plugin = getPlugin(pluginId)
  if (!plugin?.enabled || !plugin.loaded) throw new Error('Plugin unavailable')

  const send = (payload) => {
    progressSender?.({ pluginId, sourceId, ...payload })
  }

  let meta = null
  if (typeof plugin.capabilities.getSongDetail === 'function') {
    try {
      meta = normalizeSong(
        pluginId,
        await plugin.capabilities.getSongDetail(sourceId)
      )
    } catch {
      meta = null
    }
  }

  let extras = null
  if (typeof plugin.capabilities.downloadExtras === 'function') {
    try {
      extras = await plugin.capabilities.downloadExtras(sourceId)
    } catch {
      extras = null
    }
  }

  let audioUrl = extras?.audioUrl || null
  if (!audioUrl) {
    const play = await getPlayUrl(pluginId, sourceId, quality)
    audioUrl = play?.url || null
  }
  if (!audioUrl) throw new Error('No playable URL for download')

  if (!meta) {
    meta = normalizeSong(pluginId, {
      sourceId,
      title: sourceId,
      artist: plugin.name,
    })
  }

  const coverUrl = extras?.coverUrl || meta.coverUrl
  const lyrics = extras?.lyrics || meta.lyrics

  send({ phase: 'start', loaded: 0, total: null })
  const saved = await saveOnlineSong({
    downloadDir: state.downloadDir,
    meta: {
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      coverUrl,
      lyrics,
    },
    audioUrl,
    fileExtHint: extras?.fileNameHint
      ? path.extname(extras.fileNameHint)
      : undefined,
    onProgress: send,
  })

  if (!importTrackFn) throw new Error('Import hook missing')
  const track = await importTrackFn(saved.audioPath)
  send({ phase: 'imported', loaded: 1, total: 1 })
  return { track, saved }
}

module.exports = {
  initPlugins,
  reloadAll,
  listPlugins,
  getPlugin,
  getPluginsRoot,
  getDownloadDir,
  setDownloadDir,
  openPluginsFolder,
  installFromPath,
  installFromZip,
  uninstall,
  setEnabled,
  getConfig,
  setConfig,
  searchAll,
  getSongDetail,
  getPlayUrl,
  downloadSong,
  onlineSongToTrack,
  parsePluginPath,
  onlineTrackId,
  pluginPath,
}
