# Orbit Music 插件开发指南

本文说明如何为 Orbit Music 编写、安装与调试插件。插件运行在 Electron **主进程**，通过约定好的能力函数，为应用提供搜索、详情、在线试听与下载。

官方示例目录：[`plugins-examples/orbit-official-demo`](../plugins-examples/orbit-official-demo)  
（代码内含详细中文注释，建议直接对照阅读。）

---

## 1. 能做什么

| 能力 | 作用 |
| --- | --- |
| `search` | 按关键词搜索在线歌曲 |
| `getSongDetail` | 歌曲详情；**在线歌词**与下载元数据主要靠它 |
| `getPlayUrl` | 返回可播放的 HTTP(S) 音频地址（试听与下载共用） |
| `downloadExtras` | 可选；下载时的额外音频/封面/歌词地址 |

宿主负责：

- 在线播放（把插件返回的 URL 交给播放器）
- 下载落盘并入库（按本地曲库命名规则）
- 插件安装 / 启用 / 配置 UI

---

## 2. 安全与合规

- 插件是**用户主动安装的受信代码**，只安装你信任的来源。
- 宿主只提供受限 `ctx`（`fetch`、配置、日志），**不**向插件开放任意 `fs` / `child_process`。
- 请只接入你有权使用与分发的内容；不要用插件做未授权抓取或传播。

---

## 3. 安装与调试

1. 打开应用 **设置 → 插件**
2. **安装文件夹**（或 ZIP）
3. 启用插件
4. 到 **搜索 → 在线** 使用

路径说明：

| 路径 | 说明 |
| --- | --- |
| `userData/plugins/<pluginId>/` | 已安装插件 |
| `userData/plugins-state.json` | 启用状态、各插件配置、下载目录 |

**注意：** 修改了 `electron/` 或已安装插件的 `index.cjs` 后，需要**完全退出并重新 `pnpm dev`**，主进程与 preload 不会随 Vite 热更新。

试装官方示例：选择仓库内 `plugins-examples/orbit-official-demo`，在线搜索 `demo` / `orbit` / `示例`。

---

## 4. 目录与清单

```text
my-plugin/
  orbit-plugin.json   # 清单（必填）
  index.cjs           # 入口（必填，CommonJS）
  README.md           # 可选
```

### `orbit-plugin.json` 字段

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "一句话说明",
  "author": "你的名字",
  "main": "index.cjs",
  "capabilities": ["search", "getSongDetail", "getPlayUrl"],
  "configSchema": {
    "baseUrl": {
      "type": "string",
      "label": "API 根地址",
      "default": ""
    }
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一标识；仅字母数字与 `.` `_` `-` |
| `main` | 入口文件，默认 `index.cjs` |
| `capabilities` | 声明能力（展示用；真正生效的是 `registerCapabilities`） |
| `configSchema` | 可选；设置页为每个 key 生成输入框 |

---

## 5. 入口与 `ctx`

```js
module.exports = {
  async activate(ctx) {
    ctx.registerCapabilities({
      search,
      getSongDetail,
      getPlayUrl,
      // downloadExtras, // 可选
    })
  },
}
```

| 成员 | 说明 |
| --- | --- |
| `pluginId` / `pluginDir` | 当前插件信息 |
| `getConfig()` / `setConfig(partial)` | 读写用户配置 |
| `fetch(url, init)` | 发起网络请求（与全局 `fetch` 相同语义） |
| `log.info / warn / error` | 主进程日志 |
| `registerCapabilities(caps)` | 注册能力函数 |

---

## 6. 数据约定

### OnlineSong（搜索 / 详情返回）

```js
{
  sourceId: 'abc',           // 必填，插件内唯一
  title: '歌名',
  artist: '歌手',
  album: '专辑',
  duration: 240,             // 秒
  coverUrl: 'https://...',
  lyrics: '[00:00.00]...',   // 建议在 getSongDetail 中返回完整 LRC
  qualityHints: ['128', '320', 'flac'],
}
```

### getPlayUrl 返回

```js
{
  url: 'https://...',        // 必填，可直接给 <audio> 或下载
  expiresAt: 1710000000000,  // 可选，毫秒时间戳
  quality: '320',            // 可选
  mimeType: 'audio/mpeg',    // 可选
}
```

### 在线歌词为什么要 getSongDetail？

搜索结果通常不带歌词。播放页打开在线曲目时，宿主会调用 `plugins:getLyrics` → 内部走 `getSongDetail`，读取 `lyrics`。请在详情里返回完整 LRC。

### 在线曲目 path

```text
orbit-plugin://<pluginId>/<sourceId>
```

播放器据此再调 `getPlayUrl`。

---

## 7. 下载落盘规则

下载目录可在 **设置 → 插件** 修改。宿主统一写入：

```text
<downloadDir>/<专辑名>/<歌手 - 歌名>.<ext>
<downloadDir>/<专辑名>/cover.jpg
<downloadDir>/<专辑名>/<歌手 - 歌名>.lrc
```

然后自动导入本地曲库（与手动导入同一套逻辑）。

可选实现 `downloadExtras(sourceId)`，返回：

```js
{ audioUrl, coverUrl, lyrics, fileNameHint: 'song.flac' }
```

未实现时，宿主用 `getPlayUrl` + `getSongDetail` 拼下载资源。

---

## 8. 推荐对接流程（自有 HTTP API）

1. 复制 `plugins-examples/orbit-official-demo`，改 `id` / `name`
2. 在设置里配置 `baseUrl`，或直接在代码里写死你的服务地址
3. 实现三个能力，字段对齐第 6 节
4. 先测：搜索 → 在线播放 → 展开歌词 → 下载入库

官方示例在未配置 `baseUrl` 时也可离线演示；配置后会请求：

- `GET {baseUrl}/search?q=&limit=`
- `GET {baseUrl}/song/:id`
- `GET {baseUrl}/song/:id/url`

---

## 9. 渲染进程 IPC（了解即可）

`window.musicApp.plugins`：

- 管理：`list` / `installFolder` / `installZip` / `uninstall` / `setEnabled`
- 配置：`getConfig` / `setConfig` / `getDownloadDir` / `setDownloadDir` / `openFolder`
- 业务：`search` / `getDetail` / `getLyrics` / `getPlayUrl` / `download` / `onDownloadProgress`

插件开发者一般**不必**直接调 IPC，实现 `activate` 里的能力即可。

---

## 10. 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 插件按钮没反应、下载目录为空 | 主进程未重载；完全退出后重新 `pnpm dev` |
| 在线能播但无歌词 | `getSongDetail` 未返回 `lyrics`，或详情接口失败 |
| 搜索有结果但无法播放 | 检查 `getPlayUrl` 是否返回可访问的 `url` |
| 设置页配置不生效 | `configSchema` 的 key 要与 `getConfig()` 读取的字段一致 |
| 安装 ZIP 失败 | 需包含 `orbit-plugin.json`；路径不能含 `..` |

---

## 11. 相关文件

| 路径 | 说明 |
| --- | --- |
| `plugins-examples/orbit-official-demo/` | 官方示例（推荐学习） |
| `electron/plugins/host.cjs` | 插件宿主 |
| `electron/plugins/download.cjs` | 下载落盘 |
| `electron/preload.cjs` | 暴露 `musicApp.plugins` |
