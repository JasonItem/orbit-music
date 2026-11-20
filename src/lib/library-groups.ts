import { formatDuration } from '@/lib/format'
import type { Track } from '@/types/music'

export interface TrackGroup {
  id: string
  name: string
  items: Track[]
  count: number
  duration: number
  subtitle: string
  accent: string
  glow: string
  bpm: number
  coverPath: string | null
}

const ACCENTS = [
  { accent: '#c4b5fd', glow: '#a78bfa' },
  { accent: '#fb923c', glow: '#f97316' },
  { accent: '#60a5fa', glow: '#3b82f6' },
  { accent: '#22d3ee', glow: '#06b6d4' },
  { accent: '#facc15', glow: '#eab308' },
  { accent: '#4ade80', glow: '#22c55e' },
  { accent: '#f472b6', glow: '#ec4899' },
  { accent: '#a3e635', glow: '#84cc16' },
] as const

function hashName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return hash
}

export function accentForName(name: string) {
  return ACCENTS[hashName(name) % ACCENTS.length]!.accent
}

export function albumGroupKey(track: Track) {
  const album = track.album || 'Unknown Album'
  const albumArtist = (track.album_artist || '').trim()
  // MyGo: album artist can span folders; otherwise folder separates same names
  if (albumArtist) return `${album}\0${albumArtist.toLowerCase()}`
  const folder = track.path.replace(/[/\\][^/\\]+$/, '')
  return `${album}\0${folder}`
}

export function splitArtists(tag: string) {
  return tag
    .split(/\s*\/\s*|;|、|\sfeat\.\s|\sft\.\s/i)
    .map((name) => name.trim())
    .filter(Boolean)
}

export function groupTracks(
  tracks: Track[],
  mode: 'albums' | 'artists'
): TrackGroup[] {
  const map = new Map<string, Track[]>()
  for (const track of tracks) {
    if (mode === 'albums') {
      const key = albumGroupKey(track)
      const list = map.get(key) ?? []
      list.push(track)
      map.set(key, list)
      continue
    }
    const names = splitArtists(track.artist || 'Unknown Artist')
    for (const name of names.length ? names : ['Unknown Artist']) {
      const list = map.get(name) ?? []
      list.push(track)
      map.set(name, list)
    }
  }

  return [...map.entries()]
    .map(([key, items]) => {
      const name =
        mode === 'albums' ? items[0]?.album || key.split('\0')[0]! : key
      const hash = hashName(key)
      const palette = ACCENTS[hash % ACCENTS.length]!
      const duration = items.reduce((sum, track) => sum + (track.duration || 0), 0)
      const artists = [
        ...new Set(
          items.flatMap((track) =>
            splitArtists(track.album_artist || track.artist || '未知歌手')
          )
        ),
      ]
      const albums = [...new Set(items.map((track) => track.album))]
      return {
        id: key,
        name,
        items,
        count: items.length,
        duration,
        subtitle:
          mode === 'albums'
            ? artists.slice(0, 2).join(' / ') || '未知歌手'
            : `${albums.length} 张专辑 · ${items.length} 首`,
        accent: palette.accent,
        glow: palette.glow,
        bpm: 100 + (hash % 41),
        coverPath:
          items.find((track) => track.cover_path)?.cover_path ||
          items.find((track) => track.folder_cover_path)?.folder_cover_path ||
          null,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
}

export function formatGroupDuration(seconds: number) {
  if (!seconds) return '00:00'
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}:${m.toString().padStart(2, '0')}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')}`
  }
  return formatDuration(seconds)
}
