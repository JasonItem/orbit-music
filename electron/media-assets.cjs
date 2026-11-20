const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

/** @type {string | null} */
let coversDir = null

const LRC_TIME = /\[\d+:\d{2}/

function initCoversDir(userDataPath) {
  coversDir = path.join(userDataPath, 'data', 'covers')
  fs.mkdirSync(coversDir, { recursive: true })
  return coversDir
}

function getCoversDir() {
  if (!coversDir) throw new Error('Covers directory not initialized')
  return coversDir
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * MyGo sidecarRank: cover > folder > front > album, then jpg > jpeg > png.
 * Lowest rank wins for the folder.
 */
function sidecarRank(name) {
  const lower = String(name || '').toLowerCase()
  const ext = path.extname(lower)
  const e = ['.jpg', '.jpeg', '.png'].indexOf(ext)
  if (e < 0) return -1
  const stem = path.basename(lower, ext)
  const n = ['cover', 'folder', 'front', 'album'].indexOf(stem)
  if (n < 0) return -1
  return n * 3 + e
}

/** Find the best cover image beside tracks in a directory (MyGo walk sidecars). */
function findFolderSidecar(dir) {
  let best = null
  let bestRank = Infinity
  let entries = []
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return null
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const rank = sidecarRank(name)
    if (rank < 0 || rank >= bestRank) continue
    const full = path.join(dir, name)
    if (!fileExists(full)) continue
    bestRank = rank
    best = full
  }
  return best
}

const COVER_EXTS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']

/** Album cover: only cover.jpg / cover.jpeg / cover.png in the album folder. */
function findAlbumFolderCover(dir) {
  if (!dir) return null
  for (const ext of COVER_EXTS) {
    const candidate = path.join(dir, `cover${ext}`)
    if (fileExists(candidate)) return candidate
  }
  return null
}

const GENERIC_FOLDER_NAMES = new Set([
  'music',
  '音乐',
  '我的音乐',
  'download',
  'downloads',
  '下载',
  'songs',
  '歌曲',
  'audio',
  'audios',
  'media',
  'library',
  '曲库',
  'desktop',
  '桌面',
  'documents',
  '文档',
])

/** When tags lack album, use the parent folder name (skip generic roots). */
function albumNameFromFolder(filePath) {
  const dir = path.dirname(filePath)
  const base = path.basename(dir).trim()
  if (!base || base === '.' || base === path.parse(dir).root) return ''
  if (GENERIC_FOLDER_NAMES.has(base.toLowerCase())) return ''
  return base
}

function findSiblingCover(audioPath) {
  return findAlbumFolderCover(path.dirname(audioPath))
}

function findSiblingLyrics(audioPath) {
  const base = audioPath.slice(0, audioPath.length - path.extname(audioPath).length)
  for (const ext of ['.lrc', '.LRC']) {
    const candidate = `${base}${ext}`
    if (fileExists(candidate)) return candidate
  }
  return null
}

function detectImageExt(buffer, declaredMime) {
  if (!buffer || !buffer.length) return ''
  const head = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  // Match MyGo coverExt: sniff bytes first, then declared mime.
  if (head[0] === 0xff && head[1] === 0xd8) return 'jpg'
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  ) {
    return 'png'
  }
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return 'webp'
  }
  const mime = String(declaredMime || '').toLowerCase()
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return ''
}

/** Cache embedded picture by content hash (MyGo keepCover). */
function cacheEmbeddedCover(picture) {
  if (!picture?.data) return null
  const data = Buffer.from(picture.data)
  const ext = detectImageExt(data, picture.format || picture.mime || picture.MIMEType)
  if (!ext) return null
  const sum = crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)
  const outPath = path.join(getCoversDir(), `${sum}.${ext}`)
  if (!fileExists(outPath)) {
    fs.writeFileSync(outPath, data)
  }
  return outPath
}

/** Song/album cover: only folder cover.jpg / cover.png. */
function resolveCoverPath(audioPath, _pictures) {
  return findSiblingCover(audioPath)
}

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '')
}

function extractEmbeddedLyrics(lyricsTags) {
  if (!Array.isArray(lyricsTags) || lyricsTags.length === 0) return null

  // Prefer synchronized lines → LRC text
  for (const tag of lyricsTags) {
    if (Array.isArray(tag?.syncText) && tag.syncText.length > 0) {
      const lines = tag.syncText
        .filter((line) => line?.text)
        .map((line) => {
          let totalSec = Number(line.timestamp) || 0
          // music-metadata timestamps are often ms
          if (totalSec > 1000) totalSec /= 1000
          const m = Math.floor(totalSec / 60)
          const s = totalSec % 60
          const ss = Math.floor(s).toString().padStart(2, '0')
          const cs = Math.floor((s % 1) * 100)
            .toString()
            .padStart(2, '0')
          return `[${m.toString().padStart(2, '0')}:${ss}.${cs}]${line.text}`
        })
      if (lines.length) return lines.join('\n')
    }
  }

  // MyGo: plain embedded words are ignored unless they look like timed LRC
  for (const tag of lyricsTags) {
    const text = typeof tag?.text === 'string' ? stripBom(tag.text).trim() : ''
    if (text && LRC_TIME.test(text)) return text
  }

  return null
}

function readLyricsFile(lyricsPath) {
  const raw = fs.readFileSync(lyricsPath)
  // Try utf8 first; fall back to latin1 so GBK-tagged files don't crash
  let text = stripBom(raw.toString('utf8'))
  if (text.includes('\uFFFD')) {
    text = stripBom(raw.toString('latin1'))
  }
  return text
}

/**
 * MyGo Lyrics(): .lrc beside file first, else timed tags inside the audio.
 */
function resolveLyrics(audioPath, lyricsTags) {
  const lyricsPath = findSiblingLyrics(audioPath)
  if (lyricsPath) {
    try {
      return { lyricsPath, lyricsText: readLyricsFile(lyricsPath) }
    } catch {
      // fall through
    }
  }

  const embedded = extractEmbeddedLyrics(lyricsTags)
  if (embedded) {
    return { lyricsPath: null, lyricsText: embedded }
  }

  return { lyricsPath: null, lyricsText: null }
}

/** Live reload for playing track (MyGo reads lyrics on demand). */
function loadLyricsForTrack(audioPath, storedText) {
  if (!audioPath) return storedText || ''
  const lyricsPath = findSiblingLyrics(audioPath)
  if (lyricsPath) {
    try {
      return readLyricsFile(lyricsPath)
    } catch {
      // fall through
    }
  }
  const text = stripBom(storedText || '')
  if (text && LRC_TIME.test(text)) return text
  return text
}

/**
 * MyGo nameOfFile: "Artist - Title", or "01 - Title" keeps full name as title.
 */
function nameOfFile(filePath) {
  const name = path.parse(filePath).name
  const idx = name.indexOf(' - ')
  if (idx < 0) return { title: name, artist: '' }
  const before = name.slice(0, idx).trim()
  const after = name.slice(idx + 3).trim()
  if (!before || !after) return { title: name, artist: '' }
  if (/^[\d.]+$/.test(before.replace(/\s/g, ''))) {
    return { title: name, artist: '' }
  }
  return { title: after, artist: before }
}

/**
 * Light GBK/legacy fix inspired by MyGo decodeLegacy (common Chinese ID3 case).
 */
function decodeLegacy(input) {
  const s = String(input || '')
  if (!s) return s
  // Already proper Unicode with non-latin1 codepoints
  for (const ch of s) {
    if (ch.codePointAt(0) > 0xff) return s
  }
  let high = false
  const bytes = []
  for (const ch of s) {
    const code = ch.codePointAt(0)
    if (code >= 0x80) high = true
    bytes.push(code)
  }
  if (!high) return s.trim()
  try {
    const decoded = new TextDecoder('gbk').decode(Buffer.from(bytes))
    if (decoded && !decoded.includes('\uFFFD')) return decoded.trim()
  } catch {
    // TextDecoder gbk may be unavailable on some Node builds
  }
  return s.trim()
}

function cleanTag(value) {
  return decodeLegacy(String(value || '').replace(/\0/g, '')).trim()
}

/**
 * Detect real audio MIME from file magic bytes.
 * Handles mislabeled extensions (e.g. MP3 saved as .flac).
 */
function sniffAudioMime(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(12)
    try {
      fs.readSync(fd, buf, 0, 12, 0)
    } finally {
      fs.closeSync(fd)
    }
    const head4 = buf.toString('latin1', 0, 4)
    if (head4 === 'fLaC') return 'audio/flac'
    if (head4 === 'OggS') return 'audio/ogg'
    if (head4 === 'RIFF' && buf.toString('latin1', 8, 12) === 'WAVE') {
      return 'audio/wav'
    }
    if (buf.toString('latin1', 0, 3) === 'ID3') return 'audio/mpeg'
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg'
    if (buf.toString('latin1', 4, 8) === 'ftyp') return 'audio/mp4'
    if (head4 === '\x30\x26\xb2\x75') return 'audio/x-ms-wma'
  } catch {
    // ignore unreadable files
  }
  return null
}

function mimeFromExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const map = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.webm': 'audio/webm',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.wma': 'audio/x-ms-wma',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.lrc': 'text/plain; charset=utf-8',
  }
  return map[ext] || null
}

function resolveMediaMime(filePath) {
  return sniffAudioMime(filePath) || mimeFromExtension(filePath) || 'application/octet-stream'
}

module.exports = {
  initCoversDir,
  resolveCoverPath,
  resolveLyrics,
  loadLyricsForTrack,
  nameOfFile,
  cleanTag,
  findSiblingCover,
  findSiblingLyrics,
  findAlbumFolderCover,
  albumNameFromFolder,
  sniffAudioMime,
  mimeFromExtension,
  resolveMediaMime,
}
