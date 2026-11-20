export const CHARTS = [
  { id: 'soar', name: '飙升榜', count: 100, tone: 'from-violet-600 to-fuchsia-700' },
  { id: 'new', name: '新歌榜', count: 100, tone: 'from-emerald-500 to-teal-700' },
  { id: 'original', name: '原创榜', count: 100, tone: 'from-sky-500 to-blue-700' },
  { id: 'hot', name: '热歌榜', count: 200, tone: 'from-rose-500 to-red-700' },
  { id: 'classic', name: '古典榜', count: 100, tone: 'from-slate-500 to-zinc-700' },
  { id: 'edm', name: '电音榜', count: 100, tone: 'from-lime-500 to-green-700' },
  { id: 'rap', name: '中文说唱榜', count: 100, tone: 'from-orange-500 to-red-600' },
  { id: 'honor', name: '荣耀音乐热歌榜', count: 100, tone: 'from-pink-500 to-rose-700' },
] as const

export const RECOMMENDS = [
  {
    id: 'daily',
    title: '每日推荐',
    subtitle: '根据你的口味生成',
    tone: 'from-rose-600 to-orange-500',
  },
  {
    id: 'radar',
    title: '私人雷达',
    subtitle: '你爱的歌值得反复听',
    tone: 'from-indigo-600 to-cyan-500',
  },
  {
    id: 'new-songs',
    title: '新歌雷达',
    subtitle: '本周值得关注的新曲',
    tone: 'from-amber-500 to-pink-500',
  },
] as const

export const DEMO_LYRICS = [
  { time: 0, en: 'Bound to fall in love', zh: '注定要坠入爱河' },
  { time: 8, en: 'With you', zh: '与你一起' },
  { time: 16, en: 'I never felt this way before', zh: '从未有过这种感觉' },
  { time: 28, en: 'Every heartbeat calls your name', zh: '每一次心跳都呼唤你的名字' },
  { time: 40, en: 'Stay with me tonight', zh: '今夜请留在我身边' },
  { time: 52, en: 'Bound to fall in love', zh: '注定要坠入爱河' },
] as const

export const DEMO_COMMENTS = [
  {
    id: '1',
    user: '晚风少年',
    text: '意气用事了这波，但前奏真的太上头。',
    time: '23 小时前',
    reply: '同感，副歌一来直接破防。',
  },
  {
    id: '2',
    user: '磁带收藏家',
    text: '本地曲库里听这种质感更有味道。',
    time: '2 天前',
  },
  {
    id: '3',
    user: 'Ocink',
    text: '循环到第 N 遍了，先收藏再说。',
    time: '6 天前',
    reply: '已经加入「收藏」。',
  },
] as const
