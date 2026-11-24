export interface LyricWord {
  time: number
  end: number
  text: string
}

export interface LyricLine {
  time: number
  text: string
  translation?: string
  words?: LyricWord[]
}

// Allow broken exports like [00:00.00-1] (extra -N before ])
const LRC_LINE =
  /^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?(?:-\d+)?\](.*)$/
const WORD_TAG =
  /<(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?>/g

function parseClock(minutes: string, seconds: string, fraction = '0') {
  const ms =
    fraction.length <= 2
      ? Number(fraction.padEnd(2, '0')) * 10
      : Number(fraction.padEnd(3, '0').slice(0, 3))
  return Number(minutes) * 60 + Number(seconds) + ms / 1000
}

function parseTime(match: RegExpMatchArray) {
  return parseClock(match[1]!, match[2]!, match[3] || '0')
}

/** Split into CJK characters / Latin words / spaces / punctuation units. */
export function splitLyricUnits(text: string): string[] {
  const units: string[] = []
  const re =
    /[\u3400-\u9fff\uf900-\ufaff]|[A-Za-z0-9]+(?:'[A-Za-z]+)?|\s+|[^\s]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    units.push(match[0]!)
  }
  return units.length ? units : text ? [text] : []
}

function parseEnhancedWords(raw: string): LyricWord[] | null {
  if (!raw.includes('<')) return null
  WORD_TAG.lastIndex = 0
  if (!WORD_TAG.test(raw)) return null
  WORD_TAG.lastIndex = 0

  const words: LyricWord[] = []
  let lastIndex = 0
  let pendingTime: number | null = null
  let match: RegExpExecArray | null

  while ((match = WORD_TAG.exec(raw))) {
    if (pendingTime != null) {
      const chunk = raw.slice(lastIndex, match.index)
      if (chunk) {
        words.push({ time: pendingTime, end: pendingTime, text: chunk })
      }
    }
    pendingTime = parseClock(match[1]!, match[2]!, match[3] || '0')
    lastIndex = match.index + match[0].length
  }

  if (pendingTime != null) {
    const chunk = raw.slice(lastIndex)
    if (chunk) {
      words.push({ time: pendingTime, end: pendingTime, text: chunk })
    }
  }

  if (!words.length) return null

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!
    const next = words[i + 1]
    word.end = next ? next.time : word.time + Math.max(0.28, word.text.length * 0.18)
  }

  return words
}

function stripWordTags(raw: string) {
  return raw.replace(WORD_TAG, '').replace(/\s+/g, ' ').trim()
}

/**
 * MyGo SpreadWords: CJK char = one unit; Latin runs keep together;
 * singing uses ~85% of the line span (pause before next line).
 */
function synthesizeWords(
  text: string,
  start: number,
  end: number
): LyricWord[] {
  const units = splitLyricUnits(text)
  if (!units.length) return []
  const weights = units.map((unit) =>
    Math.max(1, [...unit.trim()].length || 1)
  )
  const total = weights.reduce((sum, w) => sum + w, 0)
  // MyGo: span := (end-start) * 0.85
  const span = Math.max(0.35, (end - start) * 0.85)
  let cursor = start
  return units.map((unit, index) => {
    const slice = (span * weights[index]!) / Math.max(total, 1)
    const time = cursor
    const wordEnd = cursor + Math.max(0.05, slice)
    cursor = wordEnd
    return { time, end: wordEnd, text: unit }
  })
}

function finalizeWords(lines: LyricLine[]): LyricLine[] {
  return lines.map((line, index) => {
    if (line.time < 0) return line
    const nextTime =
      lines.slice(index + 1).find((item) => item.time >= 0)?.time ??
      line.time + 4
    const end = Math.max(line.time + 0.4, nextTime - 0.05)

    if (line.words?.length) {
      const words = line.words.map((word, wordIndex) => {
        const next = line.words![wordIndex + 1]
        return {
          ...word,
          end: next
            ? next.time
            : Math.max(word.time + 0.2, Math.min(end, word.end || end)),
        }
      })
      const last = words[words.length - 1]
      if (last) last.end = Math.max(last.end, end)
      return { ...line, words }
    }

    return {
      ...line,
      words: synthesizeWords(line.text, line.time, end),
    }
  })
}

/**
 * NetEase YRC (逐字): `[startMs,durationMs](wordStart,wordDur,0)字...`
 * Same format used by AMLL / YesPlayMusic lyric API PR.
 */
export function parseYrc(raw: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const row of raw.split(/\r?\n/)) {
    const trimmed = row.trim()
    if (!trimmed) continue
    const lineMatch = trimmed.match(/^\[(\d+),(\d+)\](.*)$/)
    if (!lineMatch) continue
    const lineStartMs = Number(lineMatch[1])
    const lineDurMs = Number(lineMatch[2])
    let rest = lineMatch[3] || ''
    const words: LyricWord[] = []

    // Consume `(start,dur,0)text` segments; optional leading text before first tag ignored
    const wordRe = /\((\d+),(\d+),0\)([^\(]*)/g
    let wordMatch: RegExpExecArray | null
    while ((wordMatch = wordRe.exec(rest))) {
      const start = Number(wordMatch[1]) / 1000
      const dur = Number(wordMatch[2]) / 1000
      const text = wordMatch[3] ?? ''
      if (!text) continue
      words.push({ time: start, end: start + Math.max(0.04, dur), text })
    }
    if (!words.length) continue
    lines.push({
      time: lineStartMs / 1000,
      text: words.map((w) => w.text).join(''),
      words: words.map((w, i) => ({
        ...w,
        end:
          words[i + 1]?.time ??
          Math.max(w.end, lineStartMs / 1000 + lineDurMs / 1000),
      })),
    })
  }
  return lines
}

function looksLikeYrc(raw: string) {
  return /\[\d+,\d+\].*\(\d+,\d+,0\)/.test(raw)
}

/** Parse LRC / enhanced LRC / YRC; same-timestamp bilingual lines become text + translation. */
export function parseLyrics(raw?: string | null): LyricLine[] {
  if (!raw?.trim()) return []

  const text = raw.replace(/^\uFEFF/, '')
  if (looksLikeYrc(text)) {
    const yrc = parseYrc(text)
    if (yrc.length) return finalizeWords(yrc)
  }

  const timed: LyricLine[] = []
  const plain: LyricLine[] = []

  for (const row of text.split(/\r?\n/)) {
    const trimmed = row.trim()
    if (!trimmed) continue
    const match = trimmed.match(LRC_LINE)
    if (match) {
      const time = parseTime(match)
      const payload = (match[4] || '').trim()
      if (!payload) continue
      const words = parseEnhancedWords(payload)
      const lineText = words
        ? words.map((word) => word.text).join('')
        : stripWordTags(payload)
      if (!lineText) continue
      const prev = timed[timed.length - 1]
      if (prev && Math.abs(prev.time - time) < 0.02 && !prev.translation) {
        prev.translation = lineText
      } else {
        timed.push({
          time,
          text: lineText,
          words: words ?? undefined,
        })
      }
      continue
    }
    if (!trimmed.startsWith('[')) {
      plain.push({ time: -1, text: trimmed })
    }
  }

  if (timed.length) {
    return finalizeWords(timed.sort((a, b) => a.time - b.time))
  }
  return plain
}

export function activeLyricIndex(lines: LyricLine[], currentTime: number) {
  if (!lines.length) return -1
  if (lines.every((line) => line.time < 0)) return -1
  let active = -1
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    if (line.time < 0) continue
    if (line.time <= currentTime) active = i
    else break
  }
  return active
}

/** 0–1 karaoke progress across the active line (word-aware when possible). */
export function lineKaraokeProgress(
  line: LyricLine | undefined,
  currentTime: number
) {
  if (!line || line.time < 0) return 0
  const words = line.words
  if (!words?.length) {
    return currentTime >= line.time ? 1 : 0
  }

  const total = words.reduce((sum, word) => sum + Math.max(1, word.text.length), 0)
  if (!total) return 0

  let filled = 0
  for (const word of words) {
    const weight = Math.max(1, word.text.length)
    const span = Math.max(0.04, word.end - word.time)
    if (currentTime >= word.end) {
      filled += weight
      continue
    }
    if (currentTime <= word.time) break
    filled += weight * Math.min(1, (currentTime - word.time) / span)
    break
  }
  return Math.min(1, Math.max(0, filled / total))
}

export function activeWordIndex(line: LyricLine | undefined, currentTime: number) {
  if (!line?.words?.length) return -1
  let active = -1
  for (let i = 0; i < line.words.length; i += 1) {
    const word = line.words[i]!
    if (word.time <= currentTime) active = i
    else break
  }
  return active
}
