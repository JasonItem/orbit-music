import { CoverDiscIcon } from '@/components/app/icons/cover-disc-icon'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'

interface CoverImageProps {
  path?: string | null
  alt?: string
  accent?: string
  className?: string
  iconClassName?: string
}

export function CoverImage({
  path,
  alt = '',
  className,
  iconClassName,
}: CoverImageProps) {
  const url = useMediaUrl(path)

  return (
    <div
      className={cn(
        'bg-muted relative flex items-center justify-center overflow-hidden',
        className
      )}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        <CoverDiscIcon
          className={cn('text-muted-foreground/45 size-6', iconClassName)}
        />
      )}
    </div>
  )
}
