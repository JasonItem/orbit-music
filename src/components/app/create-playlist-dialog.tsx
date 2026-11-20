import { useState } from 'react'
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

interface CreatePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description: string) => Promise<void>
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreatePlaylistDialogProps) {
  const t = useT()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t('playlist.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(trimmed, description.trim())
      handleOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('playlist.createFailed')
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('playlist.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('playlist.createDescription')}
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
            onClick={() => handleOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
