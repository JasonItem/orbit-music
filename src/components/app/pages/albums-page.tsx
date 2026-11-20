import { useMemo } from 'react'
import { AlbumCoverCard } from '@/components/app/album-cover-card'
import { LibraryOnboarding } from '@/components/app/library-onboarding'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useT } from '@/i18n/react'
import { groupTracks } from '@/lib/library-groups'
import type { Track } from '@/types/music'

interface AlbumsPageProps {
  tracks: Track[]
  onOpenAlbum: (albumId: string) => void
  onImportFolder: () => void
}

export function AlbumsPage({
  tracks,
  onOpenAlbum,
  onImportFolder,
}: AlbumsPageProps) {
  const t = useT()
  const albums = useMemo(() => groupTracks(tracks, 'albums'), [tracks])

  if (tracks.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <LibraryOnboarding onImportFolder={onImportFolder} />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6 pb-28">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('albums.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('albums.count', { count: albums.length })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCoverCard
              key={album.name}
              group={album}
              year={
                album.items.find((track) => track.year)?.year ??
                album.subtitle
              }
              onOpen={() => onOpenAlbum(album.id)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
