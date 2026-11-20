import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useT } from '@/i18n/react'
import type { Track } from '@/types/music'

interface DeleteTrackDialogProps {
  tracks: Track[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (tracks: Track[], deleteFile: boolean) => Promise<void> | void
}

export function DeleteTrackDialog({
  tracks,
  open,
  onOpenChange,
  onConfirm,
}: DeleteTrackDialogProps) {
  const t = useT()
  const [deleteFile, setDeleteFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const count = tracks.length
  const title =
    count === 1
      ? (tracks[0]?.title ?? '')
      : t('delete.selectedLabel', { count })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDeleteFile(false)
      setSubmitting(false)
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!count) return
    setSubmitting(true)
    try {
      await onConfirm(tracks, deleteFile)
      handleOpenChange(false)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {count > 1
              ? t('delete.tracksTitle', { count })
              : t('delete.trackTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1
              ? t('delete.trackBody', { title })
              : t('delete.tracksBody', { count })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg px-1 py-2">
          <Checkbox
            checked={deleteFile}
            onCheckedChange={(value) => setDeleteFile(value === true)}
            className="mt-0.5"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">
              {t('delete.alsoDeleteFile')}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('delete.alsoDeleteFileHint')}
            </span>
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={submitting || !count}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
          >
            {deleteFile
              ? t('delete.confirmWithFile')
              : t('delete.confirmLibraryOnly')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
