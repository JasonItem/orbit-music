import { MinusIcon, SquareIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WindowControls() {
  const api = window.musicApp

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Minimize"
        onClick={() => void api?.windowMinimize()}
      >
        <MinusIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Maximize"
        onClick={() => void api?.windowMaximize()}
      >
        <SquareIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close"
        className="hover:bg-destructive/10 hover:text-destructive"
        onClick={() => void api?.windowClose()}
      >
        <XIcon />
      </Button>
    </div>
  )
}
