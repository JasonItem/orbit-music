'use strict'

/**
 * ============================================================================
 * Orbit Music 官方示例插件（orbit-official-demo）
 * ============================================================================
 *
 * 【这个插件做什么】
 *   演示如何对接 Orbit 的插件契约，提供：
 *     1. search        — 搜索歌曲列表
 *     2. getSongDetail — 歌曲详情（封面、歌词等；在线歌词依赖它）
 *     3. getPlayUrl    — 可播放 / 可下载的音频直链
 *
 * 【如何安装】
 *   设置 → 插件 → 安装文件夹 → 选中本目录 plugins-examples/orbit-official-demo
 *   启用后：搜索页 →「在线」→ 输入 demo / orbit / 示例
 *
 * 【配置项 baseUrl】（设置里插件卡片可改）
 *   - 留空：使用下方内置演示曲（无需自建服务器即可试用）
 *   - 填写：例如 https://api.example.com，则按文档约定请求你的 HTTP API
 *
 * 【远端 API 约定】（仅当配置了 baseUrl）
 *   GET {baseUrl}/search?q=关键词&limit=20
 *     响应：{ songs: [{ id, title, artist, album, duration, coverUrl, lyrics? }] }
 *   GET {baseUrl}/song/{id}
 *     响应：同上单曲对象（建议带 lyrics，供在线歌词）
 *   GET {baseUrl}/song/{id}/url
 *     响应：{ url, expiresAt?, quality?, mimeType? }
 *
 * 【重要】
 *   请只接入你有权使用与分发的音源。本示例不含任何第三方平台抓取逻辑。
 *   更完整的宿主说明见仓库 docs/plugins.md。
 */

/**
 * 插件入口：宿主加载插件后会调用 activate，并注入 ctx。
 * 你必须在这里 registerCapabilities，否则宿主找不到 search / 播放等能力。
 *
 * @param {object} ctx 宿主上下文
 * @param {string} ctx.pluginId 插件 id（与 orbit-plugin.json 一致）
 * @param {string} ctx.pluginDir 插件安装目录
 * @param {() => Record<string, unknown>} ctx.getConfig 读用户配置
 * @param {(partial: Record<string, unknown>) => Record<string, unknown>} ctx.setConfig 写配置
 * @param {(url: string, init?: RequestInit) => Promise<Response>} ctx.fetch 网络请求
 * @param {{ info: Function, warn: Function, error: Function }} ctx.log 日志
 * @param {(caps: object) => void} ctx.registerCapabilities 注册能力函数
 */
async function activate(ctx) {
  // ---------------------------------------------------------------------------
  // 内置演示数据：未配置 baseUrl 时使用
  // duration 单位：秒；lyrics 建议为标准 LRC，便于播放页逐行高亮
  // ---------------------------------------------------------------------------
  const DEMO_TRACKS = [
    {
      sourceId: 'demo-1',
      title: '演示曲目一',
      artist: 'Orbit 示例',
      album: '官方插件演示',
      duration: 372,
      coverUrl: '',
      playUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      lyrics:
        '[00:00.00]这是官方示例插件的演示歌词\n' +
        '[00:05.00]搜索「demo」或「orbit」可找到本曲\n' +
        '[00:12.00]在线播放时宿主会调用 getSongDetail 取歌词\n' +
        '[00:20.00]下载会按 专辑/歌手 - 歌名 落盘并入库',
    },
    {
      sourceId: 'demo-2',
      title: '演示曲目二',
      artist: 'Orbit 示例',
      album: '官方插件演示',
      duration: 417,
      coverUrl: '',
      playUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      lyrics:
        '[00:00.00]第二首演示曲\n' +
        '[00:06.00]可在设置中配置 baseUrl 对接自有 API',
    },
  ]

  /** 安全读取用户配置（设置页写入 plugins-state.json） */
  function getConfig() {
    try {
      return (ctx.getConfig && ctx.getConfig()) || {}
    } catch {
      return {}
    }
  }

  /** 去掉末尾斜杠，便于拼接路径 */
  function baseUrl() {
    return String(getConfig().baseUrl || '')
      .trim()
      .replace(/\/$/, '')
  }

  /**
   * 把内部演示对象转成宿主要求的 OnlineSong 形状。
   * 字段说明：
   *   sourceId     — 插件内唯一 id（字符串）
   *   title/artist/album/duration/coverUrl
   *   lyrics       — LRC 文本；搜索时可省略，详情里建议补全
   *   qualityHints — 可选，音质提示字符串数组
   */
  function toOnlineSong(song) {
    return {
      sourceId: song.sourceId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverUrl: song.coverUrl || '',
      lyrics: song.lyrics || '',
      qualityHints: ['128'],
    }
  }

  /** 本地演示：按关键词过滤；demo / orbit / 示例 / * 返回全部演示曲 */
  function matchDemo(query) {
    const q = String(query || '')
      .trim()
      .toLowerCase()
    if (!q) return []
    if (q === '*' || q === 'demo' || q === 'orbit' || q === '示例') {
      return DEMO_TRACKS.map(toOnlineSong)
    }
    return DEMO_TRACKS.filter((song) => {
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.album.toLowerCase().includes(q) ||
        song.sourceId.toLowerCase().includes(q)
      )
    }).map(toOnlineSong)
  }

  /** 把远端 JSON 一行映射为 OnlineSong；缺少 id 则丢弃 */
  function mapRemoteSong(row) {
    if (!row || typeof row !== 'object') return null
    const sourceId = String(row.id || row.sourceId || '').trim()
    if (!sourceId) return null
    return {
      sourceId,
      title: String(row.title || '未知歌名'),
      artist: String(row.artist || '未知歌手'),
      album: String(row.album || ''),
      duration: Number(row.duration) > 0 ? Number(row.duration) : 0,
      coverUrl: row.coverUrl ? String(row.coverUrl) : '',
      lyrics: row.lyrics != null ? String(row.lyrics) : '',
      qualityHints: Array.isArray(row.qualityHints)
        ? row.qualityHints.map(String)
        : [],
    }
  }

  /**
   * 远端搜索。未配置 baseUrl 时返回 null，表示改用内置演示。
   * 兼容两种响应：{ songs: [...] } 或直接返回数组。
   */
  async function searchRemote(query, opts) {
    const root = baseUrl()
    if (!root) return null
    const limit = Math.max(1, Math.min(50, Number(opts?.limit) || 20))
    const url = `${root}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    const res = await ctx.fetch(url)
    if (!res.ok) throw new Error(`search HTTP ${res.status}`)
    const data = await res.json()
    const rows = Array.isArray(data?.songs)
      ? data.songs
      : Array.isArray(data)
        ? data
        : []
    return rows.map(mapRemoteSong).filter(Boolean)
  }

  /** 远端详情：在线歌词主要靠这里返回的 lyrics */
  async function detailRemote(sourceId) {
    const root = baseUrl()
    if (!root) return null
    const res = await ctx.fetch(
      `${root}/song/${encodeURIComponent(sourceId)}`
    )
    if (!res.ok) throw new Error(`song HTTP ${res.status}`)
    return mapRemoteSong(await res.json())
  }

  /** 远端播放地址：在线试听与「下载到本地」都会用到 */
  async function playUrlRemote(sourceId) {
    const root = baseUrl()
    if (!root) return null
    const res = await ctx.fetch(
      `${root}/song/${encodeURIComponent(sourceId)}/url`
    )
    if (!res.ok) throw new Error(`url HTTP ${res.status}`)
    const data = await res.json()
    if (!data?.url) return null
    return {
      url: String(data.url),
      expiresAt: data.expiresAt ? Number(data.expiresAt) : null,
      quality: data.quality ? String(data.quality) : null,
      mimeType: data.mimeType ? String(data.mimeType) : null,
    }
  }

  // ---------------------------------------------------------------------------
  // 向宿主注册能力
  // 注意：搜索列表往往不带歌词；播放页会再调 getSongDetail 取 lyrics。
  // ---------------------------------------------------------------------------
  ctx.registerCapabilities({
    /**
     * 搜索
     * @param {string} query
     * @param {{ limit?: number, offset?: number }} [opts]
     * @returns {Promise<object[]>} OnlineSong 数组
     */
    async search(query, opts) {
      try {
        const remote = await searchRemote(query, opts)
        if (remote) return remote
      } catch (error) {
        ctx.log.warn('远端搜索失败，回退到内置演示', error)
      }
      return matchDemo(query)
    },

    /**
     * 详情（封面、歌词、时长等）
     * 宿主在线歌词、下载元数据都会依赖本方法。
     * @param {string} sourceId
     * @returns {Promise<object|null>}
     */
    async getSongDetail(sourceId) {
      try {
        const remote = await detailRemote(sourceId)
        if (remote) return remote
      } catch (error) {
        ctx.log.warn('远端详情失败，回退到内置演示', error)
      }
      const song = DEMO_TRACKS.find((item) => item.sourceId === sourceId)
      return song ? toOnlineSong(song) : null
    },

    /**
     * 播放 / 下载地址
     * @param {string} sourceId
     * @param {string} [quality] 宿主可能传入；本示例未使用，可按需读取
     * @returns {Promise<{ url: string, expiresAt?: number|null, quality?: string|null, mimeType?: string|null }|null>}
     */
    async getPlayUrl(sourceId /*, quality */) {
      try {
        const remote = await playUrlRemote(sourceId)
        if (remote) return remote
      } catch (error) {
        ctx.log.warn('远端播放地址失败，回退到内置演示', error)
      }
      const song = DEMO_TRACKS.find((item) => item.sourceId === sourceId)
      if (!song?.playUrl) return null
      return {
        url: song.playUrl,
        expiresAt: null,
        quality: '128k',
        mimeType: 'audio/mpeg',
      }
    },
  })

  ctx.log.info('orbit-official-demo 已激活')
}

module.exports = { activate }
