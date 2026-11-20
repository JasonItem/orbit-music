import { useMemo } from 'react'
import { AlbumCoverCard } from '@/components/app/album-cover-card'
import { LibraryOnboarding } from '@/components/app/library-onboarding'
import { ScrollArea } from '@/components/ui/scroll-area'
import { groupTracks } from '@/lib/library-groups'
import { useT } from '@/i18n/react'
import type { Track } from '@/types/music'

interface ArtistsPageProps {
  tracks: Track[]
  onOpenArtist: (artistName: string) => void
  onImportFolder: () => void
}

export function ArtistsPage({
  tracks,
  onOpenArtist,
  onImportFolder,
}: ArtistsPageProps) {
  const t = useT()
  const artists = useMemo(() => groupTracks(tracks, 'artists'), [tracks])

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
            {t('artists.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('artists.count', { count: artists.length })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {artists.map((artist) => (
            <AlbumCoverCard
              key={artist.name}
              group={artist}
              onOpen={() => onOpenArtist(artist.name)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
