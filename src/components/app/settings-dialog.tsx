import { useMemo, useState, type ReactNode } from 'react'
import { SearchIcon, Settings2Icon } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  ColorPicker,
  ColorPickerContent,
  ColorPickerTrigger,
} from '@/components/reui/color-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccent } from '@/hooks/use-accent'
import { useI18n } from '@/i18n/react'
import type { AppLocale } from '@/i18n'
import { ACCENT_PRESETS } from '@/lib/accent-theme'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [query, setQuery] = useState('')
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t, resolved } = useI18n()
  const { accent, previewAccent, setAccent } = useAccent()

  const showGeneral = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return t('settings.general').toLowerCase().includes(q)
  }, [query, t])

  const colorPickerI18n = useMemo(
    () =>
      resolved === 'zh-CN'
        ? {
            labels: {
              placeholder: '选择颜色',
              panelLabel: '选择主题色',
              openPicker: '打开颜色选择器',
              area: '颜色',
              hue: '色相',
              saturation: '饱和度',
              brightness: '亮度',
              lightness: '明度',
              chroma: '色度',
              red: '红',
              green: '绿',
              blue: '蓝',
              alpha: '不透明度',
              hex: '十六进制',
              format: '颜色格式',
              eyeDropper: '从屏幕取色',
              copy: '复制',
              copied: '已复制',
              clear: '清除',
              swatches: '预设',
            },
          }
        : undefined,
    [resolved]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(34rem,80vh)] w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('settings.description')}
        </DialogDescription>

        <aside className="bg-muted/40 flex w-52 shrink-0 flex-col gap-3 border-r p-3">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              placeholder={t('common.search')}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>

          <nav className="flex flex-col gap-0.5">
            {showGeneral ? (
              <div className="bg-background text-foreground flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm shadow-xs">
                <Settings2Icon className="text-brand size-4 shrink-0" />
                <span className="truncate">{t('settings.general')}</span>
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center border-b px-5 pr-12">
            <h2 className="text-base font-semibold tracking-tight">
              {t('settings.general')}
            </h2>
          </header>

          <div className="flex flex-col gap-1 overflow-y-auto p-2">
            <SettingRow label={t('settings.language')}>
              <Select
                value={locale}
                onValueChange={(value) => {
                  if (value) setLocale(value as AppLocale)
                }}
              >
                <SelectTrigger size="sm" className="min-w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="system">
                    {t('settings.followSystem')}
                  </SelectItem>
                  <SelectItem value="zh-CN">
                    {t('settings.locale.zhCN')}
                  </SelectItem>
                  <SelectItem value="en">{t('settings.locale.en')}</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <SettingRow label={t('settings.appearance')}>
              <Tabs value={theme ?? 'system'} onValueChange={setTheme}>
                <TabsList>
                  <TabsTrigger value="system">
                    {t('settings.followSystem')}
                  </TabsTrigger>
                  <TabsTrigger value="light">{t('settings.light')}</TabsTrigger>
                  <TabsTrigger value="dark">{t('settings.dark')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </SettingRow>

            <SettingRow label={t('settings.accent')}>
              <ColorPicker
                value={accent}
                format="hex"
                swatches={[...ACCENT_PRESETS]}
                i18n={colorPickerI18n}
                aria-label={t('settings.accent')}
                onValueChange={(value) => {
                  if (value) previewAccent(value)
                }}
                onValueCommit={(value) => {
                  if (value) setAccent(value)
                }}
              >
                <ColorPickerTrigger size="sm" className="min-w-40" />
                <ColorPickerContent />
              </ColorPicker>
            </SettingRow>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="hover:bg-muted/50 flex items-center justify-between gap-4 rounded-lg px-3 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
