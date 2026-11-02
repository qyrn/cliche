import { BrowserWindow, type WebContents } from 'electron'
import type { ScreenFrame } from '../shared/types'
import { IpcChannel } from '../shared/types'
import { loadRendererPage, rendererWebPreferences } from './rendererPage'

const PRIMING_FALLBACK_MS = 1000

let overlay: BrowserWindow | null = null
let overlayReady: Promise<void> = Promise.resolve()

function primeFullscreen(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(fallback)
      window.off('focus', finish)
      window.hide()
      resolve()
    }
    const fallback = setTimeout(finish, PRIMING_FALLBACK_MS)
    window.once('focus', finish)
    window.show()
  })
}

export function prepareOverlay(): void {
  const window = new BrowserWindow({
    show: false,
    frame: false,
    fullscreen: true,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    title: 'cliché',
    webPreferences: { ...rendererWebPreferences('overlay'), backgroundThrottling: false }
  })
  overlay = window
  overlayReady = loadRendererPage(window, 'overlay').then(() => primeFullscreen(window))
}

export function whenOverlayReady(): Promise<void> {
  return overlayReady
}

export function isOverlayWebContents(contents: WebContents): boolean {
  return overlay?.webContents === contents
}

export function sendFrameToOverlay(frame: ScreenFrame): void {
  overlay?.webContents.send(IpcChannel.OverlayFrame, frame)
}

export function revealOverlay(): void {
  overlay?.show()
  overlay?.focus()
}

export function hideOverlay(): void {
  overlay?.hide()
}
