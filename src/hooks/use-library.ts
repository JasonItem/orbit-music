import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { t } from '@/i18n'
import type { LibraryStats, Track } from '@/types/music'

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  const refresh = useCallback(async () => {
    if (!window.musicApp) {
      setLoading(false)
      const message = t('toast.apiUnavailableDesktop')
      setError(message)
      toast.error(message)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [list, nextStats] = await Promise.all([
        window.musicApp.listTracks({ search: '', limit: 500, offset: 0 }),
        window.musicApp.libraryStats(),
      ])
      setTracks(list.tracks)
      setTotal(list.total)
      setStats(nextStats)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('toast.loadLibraryFailed')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!window.musicApp) return
    return window.musicApp.onImportProgress((payload) => {
      setImportProgress(payload)
    })
  }, [])

  const importFiles = useCallback(async () => {
    if (!window.musicApp) return
    setImporting(true)
    setImportProgress({ done: 0, total: 0 })
    try {
      const imported = await window.musicApp.pickMusicFiles()
      toast.success(
        imported.length
          ? t('toast.importedCount', { count: imported.length })
          : t('toast.noFilesSelected')
      )
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('toast.importFailed')
      )
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }, [refresh])

  const importFolder = useCallback(async () => {
    if (!window.musicApp) return
    setImporting(true)
    setImportProgress({ done: 0, total: 0 })
    try {
      const imported = await window.musicApp.pickMusicFolder()
      toast.success(
        imported.length
          ? t('toast.importedCount', { count: imported.length })
          : t('toast.noAudioFilesFound')
      )
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('toast.importFailed')
      )
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }, [refresh])

  const removeTrack = useCallback(
    async (id: number, options?: { deleteFile?: boolean }) => {
      if (!window.musicApp) return
      const result = await window.musicApp.removeTrack(id, options)
      if (!result?.ok) {
        toast.error(t('toast.deleteFailed'))
        return
      }
      if (options?.deleteFile) {
        if (result.deletedFile) {
          toast.success(t('toast.removedFromLibraryWithFile'))
        } else if (result.fileError) {
          toast.success(t('toast.removedFromLibrary'))
          toast.error(t('toast.fileDeleteFailed', { error: result.fileError }))
        } else {
          toast.success(t('toast.removedFromLibraryFileMissing'))
        }
      } else {
        toast.success(t('toast.removedFromLibrary'))
      }
      await refresh()
    },
    [refresh]
  )

  const removeTracks = useCallback(
    async (ids: number[], options?: { deleteFile?: boolean }) => {
      if (!window.musicApp || !ids.length) return
      let ok = 0
      let deletedFiles = 0
      let fileErrors = 0
      for (const id of ids) {
        const result = await window.musicApp.removeTrack(id, options)
        if (result?.ok) {
          ok += 1
          if (result.deletedFile) deletedFiles += 1
          if (result.fileError) fileErrors += 1
        }
      }
      if (!ok) {
        toast.error(t('toast.deleteFailed'))
        return
      }
      if (options?.deleteFile) {
        toast.success(
          deletedFiles
            ? t('toast.removedCountWithFiles', {
                count: ok,
                files: deletedFiles,
              })
            : t('toast.removedCount', { count: ok })
        )
        if (fileErrors) {
          toast.error(t('toast.fileDeleteFailedCount', { count: fileErrors }))
        }
      } else {
        toast.success(
          ok === 1
            ? t('toast.removedFromLibrary')
            : t('toast.removedCount', { count: ok })
        )
      }
      await refresh()
    },
    [refresh]
  )

  return {
    tracks,
    total,
    stats,
    loading,
    error,
    importing,
    importProgress,
    refresh,
    importFiles,
    importFolder,
    removeTrack,
    removeTracks,
    reorderTracks: useCallback(async (trackIds: number[]) => {
      if (!window.musicApp?.reorderTracks) {
        throw new Error(t('toast.reorderRestartRequired'))
      }
      const next = await window.musicApp.reorderTracks(trackIds)
      setTracks(next)
      return next
    }, []),
  }
}
