import { writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { BrowserWindow, type Size, type WebPreferences } from 'electron'

const PAGE_READY_TIMEOUT_MS = 10_000
const PAGE_POLL_INTERVAL_MS = 100
const PAINT_SETTLE_MS = 250

export function createOffscreenWindow(size: Size, webPreferences: WebPreferences): BrowserWindow {
  return new BrowserWindow({
    ...size,
    show: false,
    frame: false,
    useContentSize: true,
    webPreferences: { ...webPreferences, offscreen: true }
  })
}

export async function waitForPage(window: BrowserWindow, condition: string): Promise<void> {
  const deadline = Date.now() + PAGE_READY_TIMEOUT_MS
  for (;;) {
    const satisfied: unknown = await window.webContents.executeJavaScript(condition)
    if (satisfied === true) {
      break
    }
    if (Date.now() > deadline) {
      throw new Error(`La page n'est jamais prête : ${condition}`)
    }
    await delay(PAGE_POLL_INTERVAL_MS)
  }
  await delay(PAINT_SETTLE_MS)
}

export async function savePageImage(window: BrowserWindow, path: string): Promise<void> {
  const image = await window.webContents.capturePage()
  await writeFile(path, image.toPNG())
}
