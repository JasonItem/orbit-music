import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/i18n/react'

interface RenamePlaylistDialogProps {
  open: boolean
  name: string
  description?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string) => Promise<void>
}

export function RenamePlaylistDialog({
  open,
  name: initialName,
  description: initialDescription = '',
  onOpenChange,
  onSubmit,
}: RenamePlaylistDialogProps) {
  const t = useT()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setDescription(initialDescription)
    setSubmitting(false)
  }, [open, initialName, initialDescription])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t('playlist.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(trimmed, description.trim())
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('playlist.renameFailed')
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('playlist.renameTitle')}</DialogTitle>
          <DialogDescription>
            {t('playlist.renameDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            value={name}
            placeholder={t('playlist.namePlaceholder')}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSubmit()
            }}
          />
          <Textarea
            value={description}
            placeholder={t('playlist.descPlaceholder')}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
