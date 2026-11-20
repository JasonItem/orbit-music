import { ThemeProvider } from 'next-themes'
import { MusicShell } from '@/components/app/music-shell'
import { Toaster } from '@/components/ui/sonner'
import { I18nProvider } from '@/i18n/react'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
        <MusicShell />
        <Toaster position="top-center" richColors />
      </I18nProvider>
    </ThemeProvider>
  )
}
