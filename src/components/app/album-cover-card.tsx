import { EllipsisVerticalIcon } from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/react'
import type { TrackGroup } from '@/lib/library-groups'

interface AlbumCoverCardProps {
  group: TrackGroup
  year?: number | string
  onOpen: () => void
}

export function AlbumCoverCard({ group, year, onOpen }: AlbumCoverCardProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="block w-full text-left transition-colors"
        onClick={onOpen}
        aria-label={t('toast.openAlbum', { name: group.name })}
      >
        <CoverImage
          path={group.coverPath}
          alt={group.name}
          accent={group.accent}
          className="aspect-square w-full rounded-xl"
          iconClassName="size-10"
        />
      </button>

      <div className="flex items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpen}
        >
          <div className="truncate text-sm font-medium tracking-tight">
            {group.name}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {year ?? group.subtitle}
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('toast.albumMore', { name: group.name })}
          className="shrink-0"
        >
          <EllipsisVerticalIcon />
        </Button>
      </div>
    </div>
  )
}
