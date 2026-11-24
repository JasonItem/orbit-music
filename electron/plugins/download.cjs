'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const { Readable } = require('node:stream')

const AUDIO_EXT_FROM_MIME = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
  'audio/m4a': '.m4a',
}

function sanitizeSegment(value, fallback = 'Unknown') {
  let cleaned = ''
  for (const ch of String(value || '')) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 32 || '<>:"/\\|?*'.includes(ch)) {
      cleaned += '_'
      continue
    }
    cleaned += ch
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 120)
  return cleaned || fallback
}

function extFromUrlOrMime(url, mimeType, hint) {
  if (hint && /^\.[a-z0-9]+$/i.test(hint)) return hint.toLowerCase()
  const mime = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (AUDIO_EXT_FROM_MIME[mime]) return AUDIO_EXT_FROM_MIME[mime]
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname).toLowerCase()
    if (
      [
        '.mp3',
        '.flac',
        '.ogg',
        '.opus',
        '.wav',
        '.aac',
        '.m4a',
        '.mp4',
      ].includes(ext)
    ) {
      return ext === '.mp4' ? '.m4a' : ext
    }
  } catch {
    // ignore
  }
  return '.mp3'
}

/**
 * @param {string} url
 * @param {string} destPath
 * @param {(loaded: number, total: number | null) => void} [onProgress]
 */
async function downloadToFile(url, destPath, onProgress) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'OrbitMusic/0.1' },
  })
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`)
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  const total = Number(res.headers.get('content-length')) || null
  let loaded = 0
  const body = res.body
  if (!body) throw new Error('Empty download body')

  const nodeStream = Readable.fromWeb(body)
  const tmp = `${destPath}.part`
  const out = fs.createWriteStream(tmp)
  nodeStream.on('data', (chunk) => {
    loaded += chunk.length
    onProgress?.(loaded, total)
  })
  await pipeline(nodeStream, out)
  fs.renameSync(tmp, destPath)
  return {
    path: destPath,
    mimeType: res.headers.get('content-type') || null,
    bytes: loaded,
  }
}

/**
 * Layout: <root>/<Album>/<Artist - Title>.ext + cover.jpg + sibling .lrc
 * @param {object} opts
 * @param {string} opts.downloadDir
 * @param {{ title: string; artist: string; album?: string; coverUrl?: string; lyrics?: string }} opts.meta
 * @param {string} opts.audioUrl
 * @param {string} [opts.fileExtHint]
 * @param {(payload: object) => void} [opts.onProgress]
 */
async function saveOnlineSong(opts) {
  const { downloadDir, meta, audioUrl, fileExtHint, onProgress } = opts
  if (!downloadDir) throw new Error('Download directory not set')
  if (!audioUrl) throw new Error('Missing audio URL')

  const artist = sanitizeSegment(meta.artist, 'Unknown Artist')
  const title = sanitizeSegment(meta.title, 'Unknown Title')
  const album = sanitizeSegment(meta.album || 'Unknown Album', 'Unknown Album')
  const albumDir = path.join(downloadDir, album)
  fs.mkdirSync(albumDir, { recursive: true })

  const baseName = `${artist} - ${title}`
  const audioTmpExt = fileExtHint || '.bin'
  const audioTmp = path.join(albumDir, `${baseName}${audioTmpExt}.part-dl`)

  onProgress?.({ phase: 'audio', loaded: 0, total: null })
  const audio = await downloadToFile(audioUrl, audioTmp, (loaded, total) => {
    onProgress?.({ phase: 'audio', loaded, total })
  })
  const ext = extFromUrlOrMime(audioUrl, audio.mimeType, fileExtHint)
  const audioPath = path.join(albumDir, `${baseName}${ext}`)
  if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
  fs.renameSync(audioTmp, audioPath)

  let coverPath = null
  if (meta.coverUrl) {
    try {
      onProgress?.({ phase: 'cover', loaded: 0, total: null })
      const coverDest = path.join(albumDir, 'cover.jpg')
      const coverTmp = `${coverDest}.part`
      await downloadToFile(meta.coverUrl, coverTmp, (loaded, total) => {
        onProgress?.({ phase: 'cover', loaded, total })
      })
      if (fs.existsSync(coverDest)) fs.unlinkSync(coverDest)
      fs.renameSync(coverTmp, coverDest)
      coverPath = coverDest
    } catch (error) {
      console.warn('Cover download failed', error)
    }
  }

  let lyricsPath = null
  if (meta.lyrics && String(meta.lyrics).trim()) {
    lyricsPath = path.join(albumDir, `${baseName}.lrc`)
    fs.writeFileSync(lyricsPath, String(meta.lyrics).trim(), 'utf8')
  }

  onProgress?.({ phase: 'done', loaded: 1, total: 1 })
  return { audioPath, coverPath, lyricsPath, albumDir }
}

module.exports = {
  sanitizeSegment,
  extFromUrlOrMime,
  downloadToFile,
  saveOnlineSong,
}
