import { join } from 'node:path'
import type { BrowserWindow, WebPreferences } from 'electron'

type RendererPage = 'overlay' | 'history'

export function rendererWebPreferences(page: RendererPage): WebPreferences {
  return {
    preload: join(import.meta.dirname, '../preload', `${page}.cjs`),
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    spellcheck: false
  }
}

export function loadRendererPage(window: BrowserWindow, page: RendererPage): Promise<void> {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  return devServerUrl
    ? window.loadURL(`${devServerUrl}/${page}/index.html`)
    : window.loadFile(join(import.meta.dirname, '../renderer', page, 'index.html'))
}
