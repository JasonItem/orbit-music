import { MusicIcon, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Cover / brand glyph: beamed eighth notes (图二 placeholder mark).
 * Export name kept for existing imports.
 */
export function CoverDiscIcon({ className, ...props }: LucideProps) {
  return (
    <MusicIcon
      className={cn('size-6 shrink-0', className)}
      aria-hidden="true"
      {...props}
    />
  )
}
