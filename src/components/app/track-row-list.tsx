import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CheckIcon,
  GripVerticalIcon,
  ListMusicIcon,
  ListPlusIcon,
  ListTodoIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { CoverImage } from '@/components/app/cover-image'
import { DeleteTrackDialog } from '@/components/app/delete-track-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useT } from '@/i18n/react'
import { formatDuration } from '@/lib/format'
import { albumGroupKey, splitArtists } from '@/lib/library-groups'
import { cn } from '@/lib/utils'
import type { Playlist, Track } from '@/types/music'

interface TrackRowListProps {
  tracks: Track[]
  accent?: string
  /** album: hide album column (already on album page) */
  variant?: 'artist' | 'album' | 'playlist'
  playlists?: Playlist[]
  onPlay: (track: Track, queue: Track[]) => void
  /** Append track(s) to the play queue without replacing it. */
  onAddToQueue?: (tracks: Track | Track[]) => void
  onAddToPlaylist?: (playlistId: number, track: Track) => void
  onBulkAddToPlaylist?: (
    playlistId: number,
    tracks: Track[]
  ) => Promise<void> | void
  onRemoveFromPlaylist?: (track: Track) => void
  onBulkRemoveFromPlaylist?: (tracks: Track[]) => Promise<void> | void
  onDeleteTrack?: (track: Track, deleteFile: boolean) => Promise<void> | void
  onBulkDeleteTracks?: (
    tracks: Track[],
    deleteFile: boolean
  ) => Promise<void> | void
  /** Persist new order (track ids top → bottom). Enables drag in edit mode. */
  onReorder?: (orderedIds: number[]) => Promise<void> | void
  onOpenArtist?: (artistName: string) => void
  onOpenAlbum?: (albumId: string, albumName: string) => void
}

function SortableTrackRow({
  track,
  index,
  editing,
  showAlbum,
  showActions,
  selected,
  selectedCount,
  onToggleSelect,
  onToggleRange,
  onPlay,
  onOpenArtist,
  onOpenAlbum,
  renderMenuItems,
}: {
  track: Track
  index: number
  editing: boolean
  showAlbum: boolean
  showActions: boolean
  selected: boolean
  selectedCount: number
  onToggleSelect: (id: number, checked: boolean) => void
  onToggleRange: (id: number) => void
  onPlay: () => void
  onOpenArtist?: (artistName: string) => void
  onOpenAlbum?: (albumId: string, albumName: string) => void
  renderMenuItems: (track: Track, kind: 'dropdown' | 'context') => ReactNode
}) {
  const t = useT()
  const missing = Boolean(track.missing)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled: !editing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const gridCols = editing
    ? showAlbum
      ? 'grid-cols-[1.25rem_1.25rem_2rem_minmax(0,1.5fr)_minmax(0,1fr)_auto_3.5rem]'
      : 'grid-cols-[1.25rem_1.25rem_2rem_minmax(0,1fr)_auto_3.5rem]'
    : showAlbum
      ? 'grid-cols-[2rem_minmax(0,1.5fr)_minmax(0,1fr)_auto_3.5rem]'
      : 'grid-cols-[2rem_minmax(0,1fr)_auto_3.5rem]'

  const row = (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-disabled={missing && !editing}
      className={cn(
        'group grid w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
        gridCols,
        isDragging && 'bg-muted z-10 opacity-90 shadow-md',
        missing && !editing
          ? 'cursor-not-allowed opacity-45'
          : editing
            ? 'cursor-default'
            : 'hover:bg-muted/60 cursor-pointer',
        selected && 'bg-muted/70'
      )}
      onClick={() => {
        if (editing) {
          onToggleSelect(track.id, !selected)
          return
        }
        onPlay()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (editing) onToggleSelect(track.id, !selected)
          else onPlay()
        }
      }}
    >
      {editing ? (
        <div
          className="text-muted-foreground flex cursor-grab items-center justify-center active:cursor-grabbing"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </div>
      ) : null}
      {editing ? (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            aria-label={t('tracks.select', { title: track.title })}
            onClick={(event) => {
              event.stopPropagation()
              if (!event.shiftKey) return
              event.preventDefault()
              onToggleRange(track.id)
            }}
            onCheckedChange={(value) => {
              onToggleSelect(track.id, value === true)
            }}
          />
        </div>
      ) : null}
      <span className="text-muted-foreground text-center text-xs tabular-nums">
        {index + 1}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <CoverImage
          path={missing ? null : track.cover_path}
          alt={track.title}
          className="size-10 shrink-0 rounded-md"
          iconClassName="size-4"
        />
        <div className="min-w-0">
          <div
            className={cn(
              'truncate text-sm font-medium',
              missing && 'text-muted-foreground'
            )}
          >
            {track.title}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {missing ? (
              `${track.artist} · ${t('player.fileMissingLabel')}`
            ) : onOpenArtist ? (
              <span className="inline">
                {splitArtists(track.artist || t('common.unknownArtist')).map(
                  (name, artistIndex) => (
                    <span key={`${name}-${artistIndex}`}>
                      {artistIndex > 0 ? (
                        <span className="text-muted-foreground"> / </span>
                      ) : null}
                      <button
                        type="button"
                        className="hover:text-foreground max-w-full truncate"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenArtist(name)
                        }}
                      >
                        {name}
                      </button>
                    </span>
                  )
                )}
              </span>
            ) : (
              track.artist
            )}
          </div>
        </div>
      </div>
      {showAlbum ? (
        onOpenAlbum && track.album ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground truncate text-left text-sm"
            onClick={(event) => {
              event.stopPropagation()
              onOpenAlbum(albumGroupKey(track), track.album)
            }}
          >
            {track.album}
          </button>
        ) : (
          <div className="text-muted-foreground truncate text-sm">
            {track.album}
          </div>
        )
      ) : null}
      <div
        className="flex w-8 justify-center"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('tracks.actions')}
                className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {renderMenuItems(track, 'dropdown')}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <span className="text-muted-foreground text-right text-xs tabular-nums">
        {formatDuration(track.duration)}
      </span>
    </div>
  )

  if (!showActions || editing) {
    return row
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        {renderMenuItems(track, 'context')}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function TrackRowList({
  tracks,
  variant = 'artist',
  playlists = [],
  onPlay,
  onAddToQueue,
  onAddToPlaylist,
  onBulkAddToPlaylist,
  onRemoveFromPlaylist,
  onBulkRemoveFromPlaylist,
  onDeleteTrack,
  onBulkDeleteTracks,
  onReorder,
  onOpenArtist,
  onOpenAlbum,
}: TrackRowListProps) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [orderedTracks, setOrderedTracks] = useState(tracks)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<Track[]>([])
  const [lastClickedId, setLastClickedId] = useState<number | null>(null)

  const showAlbum = variant !== 'album'
  const hasQueue = Boolean(onAddToQueue)
  const hasAdd = Boolean(
    (onAddToPlaylist || onBulkAddToPlaylist) && playlists.length > 0
  )
  const hasRemove = Boolean(onRemoveFromPlaylist || onBulkRemoveFromPlaylist)
  const hasDelete = Boolean(onDeleteTrack || onBulkDeleteTracks)
  const showActions = Boolean(hasQueue || hasAdd || hasRemove || hasDelete)
  const canReorder = Boolean(onReorder)

  useEffect(() => {
    setOrderedTracks(tracks)
  }, [tracks])

  const trackIds = useMemo(
    () => orderedTracks.map((t) => t.id),
    [orderedTracks]
  )

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<number>()
      for (const id of prev) {
        if (trackIds.includes(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [trackIds])

  const selectedTracks = useMemo(
    () => orderedTracks.filter((track) => selectedIds.has(track.id)),
    [orderedTracks, selectedIds]
  )
  const selectedCount = selectedTracks.length
  const allSelected =
    orderedTracks.length > 0 && selectedCount === orderedTracks.length
  const someSelected = selectedCount > 0 && !allSelected

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleOne = (trackId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(trackId)
      else next.delete(trackId)
      return next
    })
    setLastClickedId(trackId)
  }

  const toggleRange = (trackId: number) => {
    if (lastClickedId == null) {
      toggleOne(trackId, !selectedIds.has(trackId))
      return
    }
    const start = orderedTracks.findIndex((t) => t.id === lastClickedId)
    const end = orderedTracks.findIndex((t) => t.id === trackId)
    if (start < 0 || end < 0) {
      toggleOne(trackId, true)
      return
    }
    const [from, to] = start < end ? [start, end] : [end, start]
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (let i = from; i <= to; i += 1) {
        const id = orderedTracks[i]?.id
        if (id != null) next.add(id)
      }
      return next
    })
    setLastClickedId(trackId)
  }

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(orderedTracks.map((t) => t.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const exitEditing = () => {
    setEditing(false)
    clearSelection()
  }

  const addTracksToPlaylist = async (playlistId: number, items: Track[]) => {
    const playable = items.filter((t) => !t.missing)
    if (!playable.length) {
      toast.error(t('player.tracksUnavailable'))
      return
    }
    if (onBulkAddToPlaylist) {
      await onBulkAddToPlaylist(playlistId, playable)
    } else if (onAddToPlaylist) {
      for (const track of playable) {
        await onAddToPlaylist(playlistId, track)
      }
    }
    clearSelection()
  }

  const removeTracksFromPlaylist = async (items: Track[]) => {
    if (onBulkRemoveFromPlaylist) {
      await onBulkRemoveFromPlaylist(items)
    } else if (onRemoveFromPlaylist) {
      for (const track of items) {
        await onRemoveFromPlaylist(track)
      }
    }
    clearSelection()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = orderedTracks.findIndex((t) => t.id === active.id)
    const newIndex = orderedTracks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(orderedTracks, oldIndex, newIndex)
    setOrderedTracks(next)
    try {
      await onReorder(next.map((t) => t.id))
    } catch (error) {
      setOrderedTracks(tracks)
      toast.error(
        error instanceof Error ? error.message : t('tracks.reorderFailed')
      )
    }
  }

  const addToPlayQueue = (items: Track[]) => {
    if (!onAddToQueue) return
    const playable = items.filter((t) => !t.missing)
    if (!playable.length) {
      toast.error(t('player.tracksUnavailable'))
      return
    }
    onAddToQueue(playable)
    clearSelection()
  }

  const renderMenuItems = (track: Track, kind: 'dropdown' | 'context') => {
    const canQueue = hasQueue && !track.missing
    const canAdd = hasAdd && !track.missing
    if (kind === 'dropdown') {
      return (
        <>
          {canQueue ? (
            <DropdownMenuItem onClick={() => addToPlayQueue([track])}>
              <ListMusicIcon />
              {t('tracks.addToQueue')}
            </DropdownMenuItem>
          ) : null}
          {canAdd ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListPlusIcon />
                {t('tracks.addToPlaylist')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                {playlists.map((playlist) => (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={() =>
                      void addTracksToPlaylist(playlist.id, [track])
                    }
                  >
                    {playlist.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {hasRemove ? (
            <>
              {canQueue || canAdd ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onClick={() => void removeTracksFromPlaylist([track])}
              >
                <Trash2Icon />
                {t('tracks.removeFromPlaylist')}
              </DropdownMenuItem>
            </>
          ) : null}
          {hasDelete ? (
            <>
              {canQueue || canAdd || hasRemove ? (
                <DropdownMenuSeparator />
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPendingDelete([track])}
              >
                <Trash2Icon />
                {t('tracks.deleteTrack')}
              </DropdownMenuItem>
            </>
          ) : null}
        </>
      )
    }

    return (
      <>
        {canQueue ? (
          <ContextMenuItem onClick={() => addToPlayQueue([track])}>
            <ListMusicIcon />
            {t('tracks.addToQueue')}
          </ContextMenuItem>
        ) : null}
        {canAdd ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ListPlusIcon />
              {t('tracks.addToPlaylist')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-40">
              {playlists.map((playlist) => (
                <ContextMenuItem
                  key={playlist.id}
                  onClick={() => void addTracksToPlaylist(playlist.id, [track])}
                >
                  {playlist.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        {hasRemove ? (
          <>
            {canQueue || canAdd ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              onClick={() => void removeTracksFromPlaylist([track])}
            >
              <Trash2Icon />
              {t('tracks.removeFromPlaylist')}
            </ContextMenuItem>
          </>
        ) : null}
        {hasDelete ? (
          <>
            {canQueue || canAdd || hasRemove ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              variant="destructive"
              onClick={() => setPendingDelete([track])}
            >
              <Trash2Icon />
              {t('tracks.deleteTrack')}
            </ContextMenuItem>
          </>
        ) : null}
      </>
    )
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant={editing ? 'secondary' : 'outline'}
          aria-label={editing ? t('common.done') : t('common.edit')}
          onClick={() => {
            if (editing) exitEditing()
            else setEditing(true)
          }}
        >
          {editing ? <CheckIcon /> : <ListTodoIcon />}
        </Button>
        {editing ? (
          <span className="text-muted-foreground text-xs">
            {canReorder
              ? t('tracks.editHintReorder')
              : t('tracks.editHint')}
          </span>
        ) : null}
      </div>

      {editing && selectedCount > 0 ? (
        <div className="bg-muted/50 mb-2 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={(value) => toggleAll(value === true)}
            aria-label={t('common.selectAll')}
          />
          <span className="text-sm">
            {t('tracks.selectedCount', { count: selectedCount })}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {hasQueue ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => addToPlayQueue(selectedTracks)}
              >
                <ListMusicIcon data-icon="inline-start" />
                {t('tracks.addToQueueBulk')}
              </Button>
            ) : null}
            {hasAdd ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="secondary">
                    <ListPlusIcon data-icon="inline-start" />
                    {t('tracks.addToPlaylist')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  {playlists.map((playlist) => (
                    <DropdownMenuItem
                      key={playlist.id}
                      onClick={() =>
                        void addTracksToPlaylist(playlist.id, selectedTracks)
                      }
                    >
                      {playlist.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {hasRemove ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void removeTracksFromPlaylist(selectedTracks)}
              >
                <Trash2Icon data-icon="inline-start" />
                {t('tracks.removeFromPlaylist')}
              </Button>
            ) : null}
            {hasDelete ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setPendingDelete(selectedTracks)}
              >
                <Trash2Icon data-icon="inline-start" />
                {t('common.delete')}
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('common.clearSelection')}
              onClick={clearSelection}
            >
              <XIcon />
            </Button>
          </div>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext
          items={trackIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1">
            {orderedTracks.map((track, index) => (
              <SortableTrackRow
                key={track.id}
                track={track}
                index={index}
                editing={editing}
                showAlbum={showAlbum}
                showActions={showActions}
                selected={selectedIds.has(track.id)}
                selectedCount={selectedCount}
                onToggleSelect={toggleOne}
                onToggleRange={toggleRange}
                onPlay={() => {
                  if (track.missing) {
                    toast.error(t('player.fileMissing'))
                    return
                  }
                  onPlay(track, orderedTracks)
                }}
                onOpenArtist={onOpenArtist}
                onOpenAlbum={onOpenAlbum}
                renderMenuItems={renderMenuItems}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <DeleteTrackDialog
        tracks={pendingDelete}
        open={pendingDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingDelete([])
        }}
        onConfirm={async (items, deleteFile) => {
          if (onBulkDeleteTracks) {
            await onBulkDeleteTracks(items, deleteFile)
          } else if (onDeleteTrack) {
            for (const track of items) {
              await onDeleteTrack(track, deleteFile)
            }
          }
          clearSelection()
        }}
      />
    </>
  )
}
