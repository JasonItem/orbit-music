# Orbit Music

<p align="center">
  <img src="public/orbit-music-icon.png" alt="Orbit Music" width="128" height="128" />
</p>

<p align="center">
  <strong>A polished local music player for Windows &amp; macOS</strong><br />
  Import folders · SQLite library · lyrics · playlists · favorites
</p>

<p align="center">
  <a href="https://github.com/JasonItem/orbit-music/releases"><img alt="Release" src="https://img.shields.io/github/v/release/JasonItem/orbit-music?style=flat-square" /></a>
  <a href="https://github.com/JasonItem/orbit-music/actions/workflows/release.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/JasonItem/orbit-music/release.yml?style=flat-square&label=release" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
  <img alt="Electron" src="https://img.shields.io/badge/Electron-45-47848F?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" />
</p>

---

**Orbit Music**（环轨音乐）是一款面向本地曲库的桌面播放器：按文件夹导入音乐，用 SQLite 管理元数据，支持歌词、歌单、收藏与沉浸式播放页。界面基于 React + ReUI，运行于 Electron。

## Features

- **Folder-first library** — Import albums by folder; tags + folder names fill metadata
- **SQLite catalog** — Fast local index for songs, albums, artists, and playlists
- **Playback modes** — Shuffle, repeat all / one, queue management
- **Favorites** — Star tracks into a dedicated collection
- **Lyrics view** — Immersive now-playing page with cover atmosphere
- **Playlists** — Create, rename, reorder, and organize your own lists
- **i18n** — Chinese & English UI
- **Desktop shell** — Frameless window, sidebar navigation, keyboard-friendly controls

### Supported formats

MP3, FLAC, OGG/Opus, WAV, AAC, M4A, MP4, WMA, AIFF, WebM (Chromium-decodable codecs)

## Download

Installers are built by GitHub Actions and published on the [Releases](https://github.com/JasonItem/orbit-music/releases) page:

| Platform | Artifact |
| --- | --- |
| Windows 10/11 (x64) | `Orbit Music-*-Windows-x64.exe` |
| macOS Apple Silicon (M1/M2/M3/M4) | `Orbit Music-*-macOS-arm64.dmg` |
| macOS Intel | `Orbit Music-*-macOS-x64.dmg` |

> **macOS note:** CI builds are currently **unsigned**. On first launch, right-click the app → **Open**, or allow it in **System Settings → Privacy & Security**.

## Quick start (development)

### Requirements

- Node.js 22+
- [pnpm](https://pnpm.io/) 11+
- Windows, macOS, or Linux (Linux packaging optional)

```bash
# Clone
git clone https://github.com/JasonItem/orbit-music.git
cd orbit-music

# Install
pnpm install

# Rebuild native module (better-sqlite3) for Electron
pnpm rebuild:native

# Run (Vite + Electron)
pnpm dev
```

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start renderer + Electron in development |
| `pnpm build` | Typecheck and build the Vite renderer |
| `pnpm dist` | Build renderer and package for the current OS |
| `pnpm dist:win` | Windows NSIS installer (x64) |
| `pnpm dist:mac` | macOS DMG/ZIP for **Intel (x64)** and **Apple Silicon (arm64)** |
| `pnpm lint` | Run oxlint |
| `pnpm rebuild:native` | Rebuild `better-sqlite3` for the current Electron ABI |

## Architecture

```
orbit-music/
├── electron/          # Main process (IPC, SQLite, media, window)
│   ├── main.cjs
│   ├── preload.cjs
│   ├── db.cjs
│   └── media-assets.cjs
├── src/               # Renderer (React + Vite + Tailwind)
│   ├── components/
│   ├── hooks/
│   └── i18n/
├── build/             # Icons & macOS entitlements
├── public/            # Static assets
└── .github/workflows/ # Release CI
```

- **Main process** walks folders, parses tags via `music-metadata`, stores tracks in SQLite (`better-sqlite3`), and serves local media/covers through a custom protocol.
- **Renderer** is a React 19 SPA with a music shell, player bar, lyrics overlay, and playlist management.

## Release & CI

Push a version tag to trigger packaging for Windows and both macOS architectures, then publish a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

You can also run **Actions → Release → Run workflow** manually; artifacts upload even without creating a Release (tag pushes create the Release automatically).

Workflow matrix:

1. **windows-latest** → NSIS `.exe` (x64)
2. **macos-latest** → `.dmg` + `.zip` for `x64` and `arm64`
3. **ubuntu-latest** (on tags) → aggregate assets into a GitHub Release

## Contributing

Issues and pull requests are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-change`)
3. Commit with a clear message
4. Open a PR against `main`

Please keep changes focused; match existing TypeScript / React patterns.

## License

[MIT](LICENSE) © Orbit Music contributors

---

<p align="center">Made for people who keep their music on disk.</p>
