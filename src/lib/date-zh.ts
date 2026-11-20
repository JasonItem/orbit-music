const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

export function greetingZh(date = new Date()) {
  const hour = date.getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 11) return '早上好'
  if (hour < 13) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function formatDateZh(date = new Date()) {
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${WEEKDAYS[date.getDay()]}`
}
