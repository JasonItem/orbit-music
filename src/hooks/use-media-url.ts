import { useEffect, useState } from 'react'

export function useMediaUrl(filePath?: string | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!filePath || !window.musicApp) {
      setUrl(null)
      return
    }
    void window.musicApp.mediaUrl(filePath).then((next) => {
      if (!cancelled) setUrl(next)
    })
    return () => {
      cancelled = true
    }
  }, [filePath])

  return url
}
