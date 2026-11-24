import { FileAudioIcon, FolderOpenIcon, Mic2Icon } from 'lucide-react'
import { CoverDiscIcon } from '@/components/app/icons/cover-disc-icon'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/react'

interface LibraryOnboardingProps {
  onImportFolder: () => void
}

export function LibraryOnboarding({ onImportFolder }: LibraryOnboardingProps) {
  const t = useT()

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6 pb-28">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
          <FolderOpenIcon className="size-5" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t('onboarding.title')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('onboarding.description')}
          </p>
        </div>

        <div className="text-muted-foreground flex flex-col gap-3 text-sm leading-relaxed">
          <div className="flex flex-col gap-1">
            <p className="text-foreground text-xs font-medium">
              {t('onboarding.convention')}
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                {t('onboarding.songRule')}
                <span className="text-foreground/90">
                  {t('onboarding.songExample')}
                </span>
              </li>
              <li>
                {t('onboarding.lyricsRule')}
                <span className="text-foreground/90">.lrc</span>
                {t('onboarding.lyricsHint')}
              </li>
              <li>
                {t('onboarding.coverRule')}
                <span className="text-foreground/90">cover.jpg</span> /
                <span className="text-foreground/90">cover.png</span>
                {t('onboarding.coverHint')}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <FileAudioIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              唱游/王菲 - 红豆.flac
            </span>
            <span className="text-muted-foreground shrink-0">
              {t('onboarding.audio')}
            </span>
          </div>
          <div className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <Mic2Icon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              唱游/王菲 - 红豆.lrc
            </span>
            <span className="text-muted-foreground shrink-0">
              {t('onboarding.lyrics')}
            </span>
          </div>
          <div className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <CoverDiscIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">唱游/cover.jpg</span>
            <span className="text-muted-foreground shrink-0">
              {t('onboarding.cover')}
            </span>
          </div>
        </div>

        <div>
          <Button
            type="button"
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onImportFolder}
          >
            <FolderOpenIcon data-icon="inline-start" />
            {t('songs.importFolder')}
          </Button>
        </div>
      </div>
    </div>
  )
}