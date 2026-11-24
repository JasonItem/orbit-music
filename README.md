# Orbit Music

<p align="center">
  <img src="public/orbit-music-icon.png" alt="Orbit Music" width="128" height="128" />
</p>

<p align="center">
  <strong>面向本地曲库的桌面音乐播放器</strong><br />
  文件夹导入 · SQLite 曲库 · 歌词 · 歌单 · 收藏
</p>

<p align="center">
  <a href="https://github.com/JasonItem/orbit-music/releases"><img alt="Release" src="https://img.shields.io/github/v/release/JasonItem/orbit-music?style=flat-square" /></a>
  <a href="https://github.com/JasonItem/orbit-music/actions/workflows/release.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/JasonItem/orbit-music/release.yml?style=flat-square&label=release" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
  <img alt="Electron" src="https://img.shields.io/badge/Electron-45-47848F?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" />
</p>

---

**Orbit Music（环轨音乐）** 是一款本地音乐播放器：按文件夹导入曲库，用 SQLite 管理元数据，支持歌词、歌单、收藏与沉浸式播放页。界面基于 React + ReUI，运行于 Electron，支持 Windows 与 macOS。

## 界面预览

| 专辑 | 歌手 |
| :---: | :---: |
| ![专辑页](docs/screenshots/02-albums.png) | ![歌手页](docs/screenshots/03-artists.png) |

<p align="center">
  <img src="docs/screenshots/04-favorites.png" alt="收藏页" width="90%" />
  <br />
  <em>收藏 · 歌单与底部播放栏</em>
</p>

## 功能特性

- **按文件夹管理曲库** — 建议一专辑一文件夹；标签缺失时用文件夹名作为专辑名
- **SQLite 本地索引** — 快速检索歌曲、专辑、歌手与歌单
- **播放模式** — 随机播放、列表循环 / 单曲循环、播放队列
- **收藏** — 用星标收藏歌曲，独立入口管理
- **歌词页** — 沉浸式播放页，封面氛围背景
- **歌单** — 新建、重命名、排序与整理
- **中英双语** — 界面文案支持中文 / English
- **桌面壳层** — 无边框窗口、侧栏导航、窗口控制

### 支持格式

MP3、FLAC、OGG/Opus、WAV、AAC、M4A、MP4、WMA、AIFF、WebM（Chromium 可解码格式）

## 下载安装

安装包由 GitHub Actions 自动构建，见 [Releases](https://github.com/JasonItem/orbit-music/releases)：

| 平台 | 安装包 |
| --- | --- |
| Windows 10/11（x64） | `Orbit Music-*-Windows-x64.exe` |
| macOS Apple Silicon（M 芯片） | `Orbit Music-*-macOS-arm64.dmg` |
| macOS Intel | `Orbit Music-*-macOS-x64.dmg` |

> **macOS 提示：** CI 构建目前为**未签名**包。首次打开可右键 → **打开**，或在「系统设置 → 隐私与安全性」中允许。

## 本地音乐存放约定

导入文件夹时，推荐如下结构：

```text
专辑名/
  ├── cover.jpg                 # 专辑封面（jpg / png）
  ├── 歌手 - 歌名.flac          # 音频
  └── 歌手 - 歌名.lrc           # 同名歌词（可选）
```

- **歌曲命名：** `歌手 - 歌名.扩展名`
- **歌词：** 与音频同名的 `.lrc`，放在同一目录
- **封面：** 文件夹内的 `cover.jpg` / `cover.png`（专辑内歌曲共用）

## 开发

### 环境要求

- Node.js 22+
- [pnpm](https://pnpm.io/) 11+
- Windows / macOS / Linux（Linux 打包可选）

```bash
git clone https://github.com/JasonItem/orbit-music.git
cd orbit-music

pnpm install
pnpm rebuild:native   # 为 Electron 重建 better-sqlite3
pnpm dev              # 启动 Vite + Electron
```

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发模式启动渲染进程与 Electron |
| `pnpm build` | 类型检查并构建前端 |
| `pnpm dist` | 构建并为当前系统打包 |
| `pnpm dist:win` | 打包 Windows NSIS 安装包（x64） |
| `pnpm dist:mac` | 打包 macOS DMG/ZIP（Intel + Apple Silicon） |
| `pnpm lint` | 运行 oxlint |
| `pnpm rebuild:native` | 重建 `better-sqlite3` |

## 项目结构

```text
orbit-music/
├── electron/          # 主进程（IPC、SQLite、媒体、窗口）
│   ├── main.cjs
│   ├── preload.cjs
│   ├── db.cjs
│   └── media-assets.cjs
├── src/               # 渲染进程（React + Vite + Tailwind）
│   ├── components/
│   ├── hooks/
│   └── i18n/
├── build/             # 图标与 macOS entitlements
├── docs/screenshots/  # README 截图
├── public/            # 静态资源
└── .github/workflows/ # 发布流水线
```

- **主进程**：遍历文件夹、用 `music-metadata` 解析标签、写入 SQLite，并通过自定义协议提供本地音频与封面。
- **渲染进程**：React 19 单页应用，含音乐壳层、播放栏、歌词页与歌单管理。

## 发布与 CI

推送版本标签即可触发 Windows 与双架构 macOS 打包，并创建 GitHub Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

也可在 **Actions → Release → Run workflow** 手动触发；打标签时会自动汇总产物并发布。

构建矩阵：

1. **windows-latest** → NSIS `.exe`（x64）
2. **macos-latest** → `.dmg` / `.zip`（`x64` + `arm64`）
3. **ubuntu-latest**（标签推送时）→ 汇总产物到 Release

## 参与贡献

欢迎提交 Issue 与 Pull Request。

1. Fork 本仓库
2. 新建分支（`git checkout -b feature/your-change`）
3. 提交清晰的 commit
4. 向 `main` 发起 PR

请保持改动聚焦，并尽量遵循现有 TypeScript / React 风格。

## 许可证

[MIT](LICENSE) © Orbit Music contributors

---

<p align="center">为把音乐留在本地硬盘上的人而做。</p>
