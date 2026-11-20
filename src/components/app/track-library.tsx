import { useMemo, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import { FolderOpenIcon, PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { CoverDiscIcon } from '@/components/app/icons/cover-disc-icon'
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid'
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table'
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from '@/components/reui/frame'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration } from '@/lib/format'
import { useT } from '@/i18n/react'
import type { Track } from '@/types/music'

interface TrackLibraryProps {
  title?: string
  tracks: Track[]
  total: number
  loading: boolean
  error: string | null
  search: string
  importing: boolean
  importProgress: { done: number; total: number } | null
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onImportFiles: () => void
  onImportFolder: () => void
  onPlay: (track: Track, queue: Track[]) => void
}

export function TrackLibrary({
  title,
  tracks,
  total,
  loading,
  error,
  search,
  importing,
  importProgress,
  onSearchChange,
  onRefresh,
  onImportFiles,
  onImportFolder,
  onPlay,
}: TrackLibraryProps) {
  const t = useT()
  const pageTitle = title ?? t('nav.songs')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'title', desc: false },
  ])

  const columns = useMemo<ColumnDef<DataGridFeatures, Track>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('library.col.song'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="text-muted-foreground truncate text-xs md:hidden">
              {row.original.artist}
            </div>
          </div>
        ),
        size: 240,
      },
      {
        accessorKey: 'artist',
        header: t('library.col.artist'),
        cell: (info) => (
          <span className="truncate">{info.getValue() as string}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'album',
        header: t('library.col.album'),
        cell: (info) => (
          <span className="truncate">{info.getValue() as string}</span>
        ),
        size: 180,
      },
      {
        accessorKey: 'duration',
        header: t('library.col.duration'),
        cell: (info) => (
          <span className="tabular-nums">
            {formatDuration(info.getValue() as number)}
          </span>
        ),
        size: 72,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
        },
      },
      {
        accessorKey: 'play_count',
        header: t('library.col.plays'),
        cell: (info) => (
          <span className="tabular-nums">{info.getValue() as number}</span>
        ),
        size: 72,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
        },
      },
    ],
    [t]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: tracks,
    pageCount: Math.max(1, Math.ceil((tracks.length || 0) / pagination.pageSize)),
    getRowId: (row: Track) => String(row.id),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <Frame className="h-full min-h-0" dense spacing="sm">
      <FramePanel className="flex h-full min-h-0 flex-col gap-3 p-3">
        <FrameHeader className="px-1 pt-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <FrameTitle>{pageTitle}</FrameTitle>
              <FrameDescription>
                {t('library.totalLocal', { count: total })}
              </FrameDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading || importing}
              >
                <RefreshCwIcon data-icon="inline-start" />
                {t('songs.refresh')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onImportFolder}
                disabled={importing}
              >
                <FolderOpenIcon data-icon="inline-start" />
                {t('library.folder')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onImportFiles}
                disabled={importing}
              >
                <PlusIcon data-icon="inline-start" />
                {t('library.import')}
              </Button>
            </div>
          </div>
        </FrameHeader>

        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            placeholder={t('library.searchPlaceholder')}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>

        {importing && importProgress ? (
          <p className="text-muted-foreground text-xs">
            {t('songs.importing', {
              done: importProgress.done,
              total: importProgress.total || '…',
            })}
          </p>
        ) : null}

        {error ? (
          <div className="flex flex-col items-start gap-2 py-6">
            <p className="text-sm">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
              {t('library.retry')}
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 py-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CoverDiscIcon />
              </EmptyMedia>
              <EmptyTitle>{t('library.emptyTitle')}</EmptyTitle>
              <EmptyDescription>
                {t('library.emptyDescription')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" size="sm" onClick={onImportFiles}>
                  {t('library.importFiles')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onImportFolder}
                >
                  {t('library.importFolder')}
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <DataGrid
              table={table}
              recordCount={tracks.length}
              onRowClick={(row) => onPlay(row, tracks)}
              emptyMessage={t('library.noMatch')}
            >
              <div className="flex h-full min-h-0 flex-col gap-2.5">
                <DataGridContainer className="min-h-0 flex-1 overflow-hidden">
                  <DataGridScrollArea className="h-full">
                    <DataGridTable />
                  </DataGridScrollArea>
                </DataGridContainer>
                <DataGridPagination />
              </div>
            </DataGrid>
          </div>
        )}
      </FramePanel>
    </Frame>
  )
}
