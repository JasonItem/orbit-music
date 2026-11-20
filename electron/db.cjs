const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

/** @type {import('better-sqlite3').Database | null} */
let db = null

const LIKED_NAME = '我喜欢的音乐'

function ensureColumn(table, column, ddl) {
  const cols = getDb().prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((col) => col.name === column)) {
    getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

function initDatabase(userDataPath) {
  const dir = path.join(userDataPath, 'data')
  fs.mkdirSync(dir, { recursive: true })
  const dbPath = path.join(dir, 'library.sqlite')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT 'Unknown Artist',
      album TEXT NOT NULL DEFAULT 'Unknown Album',
      duration REAL NOT NULL DEFAULT 0,
      bitrate INTEGER,
      sample_rate INTEGER,
      year INTEGER,
      genre TEXT,
      track_no INTEGER,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      play_count INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
    CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
  `)

  ensureColumn('playlists', 'description', "description TEXT NOT NULL DEFAULT ''")
  ensureColumn('playlists', 'kind', "kind TEXT NOT NULL DEFAULT 'user'")
  ensureColumn('tracks', 'cover_path', 'cover_path TEXT')
  ensureColumn('tracks', 'folder_cover_path', 'folder_cover_path TEXT')
  ensureColumn('tracks', 'lyrics_path', 'lyrics_path TEXT')
  ensureColumn('tracks', 'lyrics_text', 'lyrics_text TEXT')
  ensureColumn('tracks', 'album_artist', "album_artist TEXT NOT NULL DEFAULT ''")
  ensureColumn('tracks', 'sort_order', 'sort_order INTEGER NOT NULL DEFAULT 0')

  // Backfill once when every row is still the default 0.
  const sortStats = getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN sort_order = 0 THEN 1 ELSE 0 END) AS zeros
       FROM tracks`
    )
    .get()
  if (sortStats.total > 0 && sortStats.zeros === sortStats.total) {
    getDb().prepare(`UPDATE tracks SET sort_order = id`).run()
  }

  const liked = db
    .prepare(`SELECT id FROM playlists WHERE kind = 'liked' LIMIT 1`)
    .get()
  if (!liked) {
    const byName = db
      .prepare(`SELECT id FROM playlists WHERE name = ? LIMIT 1`)
      .get(LIKED_NAME)
    if (byName) {
      db.prepare(`UPDATE playlists SET kind = 'liked' WHERE id = ?`).run(byName.id)
    } else {
      db.prepare(
        `INSERT INTO playlists (name, description, kind) VALUES (?, ?, 'liked')`
      ).run(LIKED_NAME, '收藏的喜欢歌曲')
    }
  }

  const userCount = db
    .prepare(`SELECT COUNT(*) AS c FROM playlists WHERE kind = 'user'`)
    .get().c
  if (userCount === 0) {
    const favorites = db
      .prepare(`SELECT id FROM playlists WHERE name = ? LIMIT 1`)
      .get('Favorites')
    if (!favorites) {
      db.prepare(
        `INSERT INTO playlists (name, description, kind) VALUES (?, ?, 'user')`
      ).run('Favorites', '')
    }
  }

  return dbPath
}

function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

function decorateTrack(row) {
  if (!row) return null
  const pathOk = Boolean(row.path && fs.existsSync(row.path))
  return {
    ...row,
    missing: !pathOk,
  }
}

function listTracks({ search = '', limit = 200, offset = 0 } = {}) {
  const q = `%${search.trim()}%`
  const rows = getDb()
    .prepare(
      `SELECT * FROM tracks
       WHERE (? = '%%')
          OR title LIKE ? COLLATE NOCASE
          OR artist LIKE ? COLLATE NOCASE
          OR album LIKE ? COLLATE NOCASE
       ORDER BY sort_order ASC, artist COLLATE NOCASE, album COLLATE NOCASE, track_no, title COLLATE NOCASE
       LIMIT ? OFFSET ?`
    )
    .all(q, q, q, q, limit, offset)

  const total = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM tracks
       WHERE (? = '%%')
          OR title LIKE ? COLLATE NOCASE
          OR artist LIKE ? COLLATE NOCASE
          OR album LIKE ? COLLATE NOCASE`
    )
    .get(q, q, q, q).c

  return { tracks: rows.map(decorateTrack), total }
}

function getTrack(id) {
  return decorateTrack(
    getDb().prepare('SELECT * FROM tracks WHERE id = ?').get(id) ?? null
  )
}

function upsertTrack(track) {
  const stmt = getDb().prepare(`
    INSERT INTO tracks (
      path, title, artist, album, album_artist, duration, bitrate, sample_rate, year, genre, track_no,
      cover_path, folder_cover_path, lyrics_path, lyrics_text
    )
    VALUES (
      @path, @title, @artist, @album, @album_artist, @duration, @bitrate, @sample_rate, @year, @genre, @track_no,
      @cover_path, @folder_cover_path, @lyrics_path, @lyrics_text
    )
    ON CONFLICT(path) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      album_artist = excluded.album_artist,
      duration = excluded.duration,
      bitrate = excluded.bitrate,
      sample_rate = excluded.sample_rate,
      year = excluded.year,
      genre = excluded.genre,
      track_no = excluded.track_no,
      cover_path = excluded.cover_path,
      folder_cover_path = excluded.folder_cover_path,
      lyrics_path = excluded.lyrics_path,
      lyrics_text = excluded.lyrics_text
    RETURNING *
  `)
  return decorateTrack(
    stmt.get({
      album_artist: '',
      cover_path: null,
      folder_cover_path: null,
      lyrics_path: null,
      lyrics_text: null,
      ...track,
    })
  )
}

function removeTrack(id, { deleteFile = false } = {}) {
  const track = getTrack(id)
  if (!track) return { ok: false, deletedFile: false }

  getDb().prepare('DELETE FROM tracks WHERE id = ?').run(id)

  let deletedFile = false
  if (deleteFile && track.path) {
    try {
      if (fs.existsSync(track.path)) {
        fs.unlinkSync(track.path)
        deletedFile = true
      }
    } catch (error) {
      console.error('Failed to delete local file', track.path, error)
      return { ok: true, deletedFile: false, fileError: String(error?.message || error) }
    }
  }

  // Only remove cached embedded covers under data/covers, never folder sidecars
  if (
    track.cover_path &&
    String(track.cover_path).includes(`${path.sep}covers${path.sep}`)
  ) {
    try {
      if (fs.existsSync(track.cover_path)) fs.unlinkSync(track.cover_path)
    } catch {
      // ignore cover cache cleanup failures
    }
  }

  return { ok: true, deletedFile }
}

function bumpPlay(id) {
  getDb()
    .prepare(
      `UPDATE tracks
       SET play_count = play_count + 1, last_played_at = datetime('now')
       WHERE id = ?`
    )
    .run(id)
  return getTrack(id)
}

function libraryStats() {
  return getDb()
    .prepare(
      `SELECT
         COUNT(*) AS tracks,
         COUNT(DISTINCT artist) AS artists,
         COUNT(DISTINCT album) AS albums,
         COALESCE(SUM(duration), 0) AS duration
       FROM tracks`
    )
    .get()
}

const PLAYLIST_COVER_SQL = `
  (
    SELECT t.cover_path
    FROM playlist_tracks pt_cover
    JOIN tracks t ON t.id = pt_cover.track_id
    WHERE pt_cover.playlist_id = p.id
      AND t.cover_path IS NOT NULL
      AND TRIM(t.cover_path) != ''
    ORDER BY pt_cover.position ASC, pt_cover.track_id ASC
    LIMIT 1
  ) AS cover_path
`

function mapPlaylist(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    kind: row.kind ?? 'user',
    created_at: row.created_at,
    track_count: row.track_count ?? 0,
    cover_path: row.cover_path || null,
  }
}

function listPlaylists({ includeLiked = true } = {}) {
  const rows = getDb()
    .prepare(
      `SELECT p.*, COUNT(pt.track_id) AS track_count, ${PLAYLIST_COVER_SQL}
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE (? = 1 OR p.kind != 'liked')
       GROUP BY p.id
       ORDER BY
         CASE WHEN p.kind = 'liked' THEN 0 ELSE 1 END,
         p.created_at ASC,
         p.name COLLATE NOCASE`
    )
    .all(includeLiked ? 1 : 0)
  return rows.map(mapPlaylist)
}

function getPlaylist(id) {
  const row = getDb()
    .prepare(
      `SELECT p.*, COUNT(pt.track_id) AS track_count, ${PLAYLIST_COVER_SQL}
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`
    )
    .get(id)
  return mapPlaylist(row)
}

function getLikedPlaylist() {
  const row = getDb()
    .prepare(
      `SELECT p.*, COUNT(pt.track_id) AS track_count, ${PLAYLIST_COVER_SQL}
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.kind = 'liked'
       GROUP BY p.id
       LIMIT 1`
    )
    .get()
  return mapPlaylist(row)
}

function listPlaylistTracks(playlistId) {
  return getDb()
    .prepare(
      `SELECT t.*
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position ASC, pt.track_id ASC`
    )
    .all(playlistId)
    .map(decorateTrack)
}

function createPlaylist(name, description = '') {
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('歌单名称不能为空')
  if (trimmed === LIKED_NAME) throw new Error('该名称已被系统占用')

  try {
    const result = getDb()
      .prepare(
        `INSERT INTO playlists (name, description, kind) VALUES (?, ?, 'user')`
      )
      .run(trimmed, String(description || '').trim())
    return getPlaylist(result.lastInsertRowid)
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE')) {
      throw new Error('已存在同名歌单')
    }
    throw error
  }
}

function deletePlaylist(id) {
  const playlist = getPlaylist(id)
  if (!playlist) throw new Error('歌单不存在')
  if (playlist.kind === 'liked') throw new Error('不能删除「我喜欢的音乐」')
  getDb().prepare('DELETE FROM playlists WHERE id = ?').run(id)
  return true
}

function renamePlaylist(id, name, description) {
  const playlist = getPlaylist(id)
  if (!playlist) throw new Error('歌单不存在')
  if (playlist.kind === 'liked') throw new Error('不能重命名「我喜欢的音乐」')

  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('歌单名称不能为空')
  if (trimmed === LIKED_NAME) throw new Error('该名称已被系统占用')

  const nextDescription =
    description === undefined
      ? playlist.description
      : String(description || '').trim()

  try {
    getDb()
      .prepare(
        `UPDATE playlists SET name = ?, description = ? WHERE id = ?`
      )
      .run(trimmed, nextDescription, id)
    return getPlaylist(id)
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE')) {
      throw new Error('已存在同名歌单')
    }
    throw error
  }
}

function addTrackToPlaylist(playlistId, trackId) {
  const playlist = getPlaylist(playlistId)
  if (!playlist) throw new Error('歌单不存在')
  const track = getTrack(trackId)
  if (!track) throw new Error('歌曲不存在')

  const existing = getDb()
    .prepare(
      `SELECT 1 AS ok FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`
    )
    .get(playlistId, trackId)
  if (existing) return getPlaylist(playlistId)

  const maxPos = getDb()
    .prepare(
      `SELECT COALESCE(MAX(position), -1) AS max_pos
       FROM playlist_tracks WHERE playlist_id = ?`
    )
    .get(playlistId).max_pos

  getDb()
    .prepare(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position)
       VALUES (?, ?, ?)`
    )
    .run(playlistId, trackId, maxPos + 1)

  return getPlaylist(playlistId)
}

function removeTrackFromPlaylist(playlistId, trackId) {
  getDb()
    .prepare(
      `DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`
    )
    .run(playlistId, trackId)
  return getPlaylist(playlistId)
}

function isTrackInPlaylist(playlistId, trackId) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`
    )
    .get(playlistId, trackId)
  return Boolean(row)
}

/** Permute sort_order slots for the given track ids (library / album / artist). */
function reorderTracks(trackIds) {
  const ids = Array.isArray(trackIds)
    ? trackIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : []
  if (ids.length < 2) return listTracks({ limit: 5000, offset: 0 }).tracks

  const placeholders = ids.map(() => '?').join(',')
  const current = getDb()
    .prepare(
      `SELECT id, sort_order FROM tracks WHERE id IN (${placeholders})`
    )
    .all(...ids)
  if (current.length < 2) return listTracks({ limit: 5000, offset: 0 }).tracks

  const slots = current
    .map((row) => Number(row.sort_order) || 0)
    .sort((a, b) => a - b)
  const update = getDb().prepare(
    `UPDATE tracks SET sort_order = ? WHERE id = ?`
  )
  const tx = getDb().transaction(() => {
    ids.forEach((id, index) => {
      update.run(slots[index] ?? index, id)
    })
  })
  tx()
  return listTracks({ limit: 5000, offset: 0 }).tracks
}

function reorderPlaylistTracks(playlistId, trackIds) {
  const playlist = getPlaylist(playlistId)
  if (!playlist) throw new Error('歌单不存在')
  const ids = Array.isArray(trackIds)
    ? trackIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : []
  const update = getDb().prepare(
    `UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?`
  )
  const tx = getDb().transaction(() => {
    ids.forEach((trackId, index) => {
      update.run(index, playlistId, trackId)
    })
  })
  tx()
  return listPlaylistTracks(playlistId)
}

function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = {
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
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  isTrackInPlaylist,
  reorderTracks,
  reorderPlaylistTracks,
  closeDatabase,
}
