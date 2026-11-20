import { useMemo, useState, type ReactNode } from 'react'
import {
  ChevronRightIcon,
  StarIcon,
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UserRoundIcon,
} from 'lucide-react'
import { CoverImage } from '@/components/app/cover-image'
import { CoverDiscIcon } from '@/components/app/icons/cover-disc-icon'
import { SettingsDialog } from '@/components/app/settings-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useT } from '@/i18n/react'
import type { MessageKey } from '@/i18n'
import { accentForName } from '@/lib/library-groups'
import type { NavId, Playlist } from '@/types/music'

interface AppSidebarProps {
  active: NavId
  activePlaylistId?: number | null
  search: string
  playlists: Playlist[]
  onSearchChange: (value: string) => void
  onSearchSubmit: (query: string) => void
  onNavigate: (id: NavId, playlistId?: number) => void
  onCreatePlaylist: () => void
}

interface RailItem {
  id: NavId
  labelKey: MessageKey
  icon: ReactNode
}

function PlaylistCover({
  name,
  coverPath,
}: {
  name: string
  coverPath?: string | null
}) {
  return (
    <CoverImage
      path={coverPath}
      alt=""
      accent={accentForName(name)}
      className="size-5 shrink-0 rounded-sm"
      iconClassName="size-2.5"
    />
  )
}

export function AppSidebar({
  active,
  activePlaylistId = null,
  search,
  playlists,
  onSearchChange,
  onSearchSubmit,
  onNavigate,
  onCreatePlaylist,
}: AppSidebarProps) {
  const t = useT()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const nav = useMemo<RailItem[]>(
    () => [
      {
        id: 'songs',
        labelKey: 'nav.songs',
        icon: <CoverDiscIcon aria-hidden="true" />,
      },
      {
        id: 'albums',
        labelKey: 'nav.albums',
        icon: <LayoutGridIcon aria-hidden="true" />,
      },
      {
        id: 'artists',
        labelKey: 'nav.artists',
        icon: <UserRoundIcon aria-hidden="true" />,
      },
      {
        id: 'liked',
        labelKey: 'nav.liked',
        icon: <StarIcon aria-hidden="true" />,
      },
    ],
    []
  )

  return (
    <Sidebar collapsible="icon" className="absolute h-full">
      <SidebarHeader className="app-drag gap-3 p-3 group-data-[collapsible=icon]:hidden">
        <div className="app-no-drag">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              placeholder={t('nav.search')}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                onSearchSubmit(search)
              }}
            />
          </InputGroup>
        </div>
      </SidebarHeader>

      <SidebarContent role="navigation" aria-label={t('nav.main')}>
        <SidebarGroup className="p-3 group-data-[collapsible=icon]:p-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {nav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    tooltip={t(item.labelKey)}
                    className="data-active:[&_svg]:text-brand"
                    onClick={() => onNavigate(item.id)}
                  >
                    {item.icon}
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible
          defaultOpen
          className="group/collapsible group-data-[collapsible=icon]:hidden"
        >
          <SidebarGroup className="p-3 group-data-[collapsible=icon]:p-2">
            <SidebarGroupLabel asChild>
              <div className="flex w-full items-center gap-1">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-1 text-left">
                  <span className="truncate">{t('nav.playlists')}</span>
                  <ChevronRightIcon className="text-sidebar-foreground/60 ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('nav.createPlaylist')}
                  className="size-6 shrink-0"
                  onClick={onCreatePlaylist}
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </div>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {playlists.length === 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={t('nav.createPlaylist')}
                        onClick={onCreatePlaylist}
                      >
                        <PlusIcon />
                        <span>{t('nav.createPlaylist')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    playlists.map((playlist) => (
                      <SidebarMenuItem key={playlist.id}>
                        <SidebarMenuButton
                          isActive={
                            active === 'playlist' &&
                            activePlaylistId === playlist.id
                          }
                          tooltip={playlist.name}
                          onClick={() => onNavigate('playlist', playlist.id)}
                        >
                          <PlaylistCover
                            name={playlist.name}
                            coverPath={playlist.cover_path}
                          />
                          <span className="truncate">{playlist.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t('nav.settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
              <span>{t('nav.settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  )
}
