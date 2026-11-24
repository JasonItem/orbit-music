import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  FolderOpenIcon,
  FolderPlusIcon,
  FileArchiveIcon,
  PuzzleIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  ColorPicker,
  ColorPickerContent,
  ColorPickerTrigger,
} from '@/components/reui/color-picker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import type { PluginInfo } from '@/types/music'

type SettingsSection = 'general' | 'plugins'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<SettingsSection>('general')
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t, resolved } = useI18n()
  const { accent, previewAccent, setAccent } = useAccent()

  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [downloadDir, setDownloadDir] = useState('')
  const [pluginsLoading, setPluginsLoading] = useState(false)
  const [pluginsApiReady, setPluginsApiReady] = useState(true)
  const [configDrafts, setConfigDrafts] = useState<
    Record<string, Record<string, string>>
  >({})

  const requirePluginsApi = useCallback(() => {
    if (!window.musicApp?.plugins) {
      setPluginsApiReady(false)
      toast.error(t('plugins.restartRequired'))
      return null
    }
    setPluginsApiReady(true)
    return window.musicApp.plugins
  }, [t])

  const refreshPlugins = useCallback(async () => {
    const api = window.musicApp?.plugins
    if (!api) {
      setPluginsApiReady(false)
      setPlugins([])
      setDownloadDir('')
      return
    }
    setPluginsApiReady(true)
    setPluginsLoading(true)
    try {
      const [list, dir] = await Promise.all([
        api.list(),
        api.getDownloadDir(),
      ])
      setPlugins(list)
      setDownloadDir(dir)
      const drafts: Record<string, Record<string, string>> = {}
      await Promise.all(
        list.map(async (plugin) => {
          const cfg = await api.getConfig(plugin.id)
          drafts[plugin.id] = Object.fromEntries(
            Object.entries(cfg).map(([k, v]) => [k, String(v ?? '')])
          )
        })
      )
      setConfigDrafts(drafts)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('plugins.loadFailed')
      )
    } finally {
      setPluginsLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!open || section !== 'plugins') return
    void refreshPlugins()
  }, [open, section, refreshPlugins])

  const showGeneral = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      t('settings.general').toLowerCase().includes(q) ||
      t('settings.language').toLowerCase().includes(q) ||
      t('settings.appearance').toLowerCase().includes(q)
    )
  }, [query, t])

  const showPlugins = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      t('settings.plugins').toLowerCase().includes(q) ||
      t('plugins.downloadDir').toLowerCase().includes(q) ||
      plugins.some(
        (p) =>
          p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      )
    )
  }, [query, t, plugins])

  useEffect(() => {
    if (section === 'general' && !showGeneral && showPlugins) {
      setSection('plugins')
    } else if (section === 'plugins' && !showPlugins && showGeneral) {
      setSection('general')
    }
  }, [section, showGeneral, showPlugins])

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

  const sectionTitle =
    section === 'plugins' ? t('settings.plugins') : t('settings.general')

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
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  section === 'general'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
                onClick={() => setSection('general')}
              >
                <Settings2Icon className="text-brand size-4 shrink-0" />
                <span className="truncate">{t('settings.general')}</span>
              </button>
            ) : null}
            {showPlugins ? (
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  section === 'plugins'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
                onClick={() => setSection('plugins')}
              >
                <PuzzleIcon className="text-brand size-4 shrink-0" />
                <span className="truncate">{t('settings.plugins')}</span>
              </button>
            ) : null}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center border-b px-5 pr-12">
            <h2 className="text-base font-semibold tracking-tight">
              {sectionTitle}
            </h2>
          </header>

          {section === 'general' ? (
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
                    <TabsTrigger value="light">
                      {t('settings.light')}
                    </TabsTrigger>
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
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto p-3">
              <p className="text-muted-foreground px-1 text-sm">
                {t('plugins.intro')}
              </p>

              {!pluginsApiReady ? (
                <div className="border-destructive/40 bg-destructive/10 text-destructive mx-1 rounded-lg border px-3 py-2 text-sm">
                  {t('plugins.restartRequired')}
                </div>
              ) : null}

              <SettingRow label={t('plugins.downloadDir')}>
                <div className="flex max-w-[22rem] items-center gap-2">
                  <span
                    className="text-muted-foreground truncate text-xs"
                    title={downloadDir}
                  >
                    {downloadDir || '—'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const api = requirePluginsApi()
                      if (!api) return
                      void api
                        .setDownloadDir()
                        .then((dir) => {
                          setDownloadDir(dir)
                          toast.success(t('plugins.downloadDirUpdated'))
                        })
                        .catch((error) => {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : t('plugins.loadFailed')
                          )
                        })
                    }}
                  >
                    {t('plugins.changeDir')}
                  </Button>
                </div>
              </SettingRow>

              <div className="flex flex-wrap gap-2 px-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const api = requirePluginsApi()
                    if (!api) return
                    void api
                      .installFolder()
                      .then((plugin) => {
                        if (plugin) {
                          toast.success(
                            t('plugins.installed', { name: plugin.name })
                          )
                          void refreshPlugins()
                        }
                      })
                      .catch((error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : t('plugins.installFailed')
                        )
                      })
                  }}
                >
                  <FolderPlusIcon />
                  {t('plugins.installFolder')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const api = requirePluginsApi()
                    if (!api) return
                    void api
                      .installZip()
                      .then((plugin) => {
                        if (plugin) {
                          toast.success(
                            t('plugins.installed', { name: plugin.name })
                          )
                          void refreshPlugins()
                        }
                      })
                      .catch((error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : t('plugins.installFailed')
                        )
                      })
                  }}
                >
                  <FileArchiveIcon />
                  {t('plugins.installZip')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const api = requirePluginsApi()
                    if (!api) return
                    void api.openFolder().catch((error) => {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t('plugins.loadFailed')
                      )
                    })
                  }}
                >
                  <FolderOpenIcon />
                  {t('plugins.openFolder')}
                </Button>
              </div>

              {pluginsLoading && plugins.length === 0 ? (
                <p className="text-muted-foreground px-1 text-sm">
                  {t('plugins.loading')}
                </p>
              ) : plugins.length === 0 ? (
                <p className="text-muted-foreground px-1 text-sm">
                  {t('plugins.empty')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {plugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      className="border-border/60 flex flex-col gap-2 rounded-lg border px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {plugin.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              v{plugin.version}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {plugin.id}
                            {plugin.author ? ` · ${plugin.author}` : ''}
                          </p>
                          {plugin.description ? (
                            <p className="text-muted-foreground mt-1 text-sm">
                              {plugin.description}
                            </p>
                          ) : null}
                          {plugin.error ? (
                            <p className="text-destructive mt-1 text-xs">
                              {plugin.error}
                            </p>
                          ) : null}
                          {plugin.capabilityNames.length > 0 ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {plugin.capabilityNames.join(' · ')}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={plugin.enabled}
                              onCheckedChange={(checked) => {
                                void window.musicApp?.plugins
                                  ?.setEnabled(plugin.id, Boolean(checked))
                                  .then(() => refreshPlugins())
                                  .catch((error) => {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : t('plugins.loadFailed')
                                    )
                                  })
                              }}
                            />
                            {t('plugins.enabled')}
                          </label>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('plugins.uninstall')}
                            onClick={() => {
                              void window.musicApp?.plugins
                                ?.uninstall(plugin.id)
                                .then(() => {
                                  toast.success(
                                    t('plugins.uninstalled', {
                                      name: plugin.name,
                                    })
                                  )
                                  void refreshPlugins()
                                })
                                .catch((error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : t('plugins.loadFailed')
                                  )
                                })
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>

                      {plugin.configSchema &&
                      Object.keys(plugin.configSchema).length > 0 ? (
                        <div className="flex flex-col gap-2 border-t pt-2">
                          {Object.entries(plugin.configSchema).map(
                            ([key, schema]) => {
                              const meta =
                                schema && typeof schema === 'object'
                                  ? (schema as {
                                      label?: string
                                      type?: string
                                    })
                                  : {}
                              return (
                                <div
                                  key={key}
                                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <span className="text-sm">
                                    {meta.label || key}
                                  </span>
                                  <Input
                                    className="h-8 sm:max-w-56"
                                    value={configDrafts[plugin.id]?.[key] ?? ''}
                                    onChange={(event) => {
                                      const value = event.target.value
                                      setConfigDrafts((prev) => ({
                                        ...prev,
                                        [plugin.id]: {
                                          ...(prev[plugin.id] || {}),
                                          [key]: value,
                                        },
                                      }))
                                    }}
                                    onBlur={() => {
                                      const draft =
                                        configDrafts[plugin.id] || {}
                                      void window.musicApp?.plugins
                                        ?.setConfig(plugin.id, draft)
                                        .then(() => {
                                          toast.message(
                                            t('plugins.configSaved')
                                          )
                                        })
                                    }}
                                  />
                                </div>
                              )
                            }
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
