'use strict'

/**
 * @typedef {object} OnlineSong
 * @property {string} pluginId
 * @property {string} sourceId
 * @property {string} title
 * @property {string} artist
 * @property {string} [album]
 * @property {number} [duration]
 * @property {string} [coverUrl]
 * @property {string} [lyrics]
 * @property {string[]} [qualityHints]
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {object} PlayUrlResult
 * @property {string} url
 * @property {number} [expiresAt]
 * @property {string} [quality]
 * @property {string} [mimeType]
 */

/**
 * @typedef {object} PluginCapabilities
 * @property {(query: string, opts?: { limit?: number; offset?: number }) => Promise<OnlineSong[]>} [search]
 * @property {(sourceId: string) => Promise<OnlineSong | null>} [getSongDetail]
 * @property {(sourceId: string, quality?: string) => Promise<PlayUrlResult | null>} [getPlayUrl]
 * @property {(sourceId: string) => Promise<{ audioUrl?: string; coverUrl?: string; lyrics?: string; fileNameHint?: string } | null>} [downloadExtras]
 */

/**
 * @typedef {object} LoadedPlugin
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {string} author
 * @property {string} dir
 * @property {string[]} capabilityNames
 * @property {boolean} enabled
 * @property {boolean} loaded
 * @property {string | null} error
 * @property {PluginCapabilities} capabilities
 * @property {Record<string, unknown>} [configSchema]
 */

/** @type {Map<string, LoadedPlugin>} */
const plugins = new Map()

function listPlugins() {
  return [...plugins.values()].map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    description: p.description,
    author: p.author,
    dir: p.dir,
    capabilityNames: p.capabilityNames,
    enabled: p.enabled,
    loaded: p.loaded,
    error: p.error,
    configSchema: p.configSchema || null,
  }))
}

/** @param {string} id */
function getPlugin(id) {
  return plugins.get(id) || null
}

/** @param {LoadedPlugin} plugin */
function setPlugin(plugin) {
  plugins.set(plugin.id, plugin)
}

/** @param {string} id */
function removePlugin(id) {
  plugins.delete(id)
}

function clearPlugins() {
  plugins.clear()
}

/**
 * @param {string} capability
 * @returns {LoadedPlugin[]}
 */
function pluginsWithCapability(capability) {
  return [...plugins.values()].filter(
    (p) =>
      p.enabled &&
      p.loaded &&
      typeof p.capabilities?.[capability] === 'function'
  )
}

module.exports = {
  listPlugins,
  getPlugin,
  setPlugin,
  removePlugin,
  clearPlugins,
  pluginsWithCapability,
}
