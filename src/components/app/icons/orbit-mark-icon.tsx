import { cn } from '@/lib/utils'

interface OrbitMarkIconProps {
  className?: string
  title?: string
}

/** Brand mark: orbital ring around a core — used in sidebar and empty covers. */
export function OrbitMarkIcon({ className, title }: OrbitMarkIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4 shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.5"
        transform="rotate(-28 16 16)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="4.25" fill="currentColor" />
      <circle cx="26.5" cy="11.2" r="2.1" fill="currentColor" />
    </svg>
  )
}
