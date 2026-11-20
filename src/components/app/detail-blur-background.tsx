import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'

interface DetailBlurBackgroundProps {
  coverPath?: string | null
  className?: string
}

/**
 * Apple Music–style frosted cover backdrop: oversized blurred art + readable scrim.
 */
export function DetailBlurBackground({
  coverPath,
  className,
}: DetailBlurBackgroundProps) {
  const url = useMediaUrl(coverPath)

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      {url ? (
        <div
          className="absolute inset-[-28%] bg-cover bg-center opacity-80 blur-[72px] saturate-[1.35] contrast-[1.05]"
          style={{ backgroundImage: `url(${url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/40 via-background to-background" />
      )}
      <div className="absolute inset-0 bg-background/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background/85" />
    </div>
  )
}
