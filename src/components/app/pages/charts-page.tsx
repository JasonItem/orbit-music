import { ScrollArea } from '@/components/ui/scroll-area'
import { CHARTS } from '@/data/mock-ui'
import { useT } from '@/i18n/react'
import { cn } from '@/lib/utils'

interface ChartsPageProps {
  onOpenChart: (id: string) => void
}

export function ChartsPage({ onOpenChart }: ChartsPageProps) {
  const t = useT()

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('charts.title')}
        </h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {CHARTS.map((chart) => (
            <button
              key={chart.id}
              type="button"
              onClick={() => onOpenChart(chart.id)}
              className="flex flex-col gap-2 text-left transition-colors"
            >
              <div
                className={cn(
                  'aspect-square w-full bg-linear-to-br p-4',
                  chart.tone
                )}
              >
                <div className="text-primary-foreground text-base font-semibold">
                  {chart.name}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="truncate text-sm font-medium">{chart.name}</div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {t('common.trackCount', { count: chart.count })}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
