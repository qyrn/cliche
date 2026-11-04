import { mkdtempSync } from 'node:fs'
import { mkdir, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { app, ipcMain, type BrowserWindow, type IpcMainEvent, type Size } from 'electron'
import { IpcChannel, type Region } from '../shared/types'
import { saveCapture } from './captureStore'
import { serveCaptureFiles } from './captureProtocol'
import { imageOfRegion } from './frameRegion'
import { registerHistoryIpc } from './historyIpc'
import { createOffscreenWindow, savePageImage, waitForPage } from './offscreenPage'
import { loadRendererPage, rendererWebPreferences } from './rendererPage'
import { renderScene, SCENE_SIZE, type Scene } from './screenshotScene'

const HISTORY_SIZE: Size = { width: 1080, height: 720 }
const SELECTION_PADDING_PIXELS = 16
const FRAME_DRAWN_TIMEOUT_MS = 10_000

const ACTION_BAR_SHOWN = "!document.querySelector('#actions').hidden"
const VISIBLE_THUMBNAILS_LOADED = `document.querySelectorAll('.frame').length > 0 &&
  [...document.images]
    .filter((image) => image.getBoundingClientRect().top < window.innerHeight)
    .every((image) => image.complete && image.naturalWidth > 0)`

function sampleCaptureTimes(now: Date): number[] {
  const daysAgoAt = (days: number, hours: number, minutes: number): number =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hours, minutes).getTime()
  return [
    daysAgoAt(0, 14, 32),
    daysAgoAt(0, 11, 5),
    daysAgoAt(0, 9, 48),
    daysAgoAt(1, 21, 47),
    daysAgoAt(1, 18, 12),
    daysAgoAt(1, 14, 30),
    daysAgoAt(3, 16, 40),
    daysAgoAt(3, 10, 5)
  ]
}

async function seedHistory(scene: Scene): Promise<void> {
  for (const [index, takenAt] of sampleCaptureTimes(new Date()).entries()) {
    const region = scene.sampleRegions[index]
    if (!region) {
      throw new Error(`La scène n'a que ${scene.sampleRegions.length} zones data-capture`)
    }
    const path = await saveCapture(imageOfRegion(scene.frame, region).toPNG())
    await utimes(path, takenAt / 1000, takenAt / 1000)
  }
}

function paddedRegion(region: Region, padding: number): Region {
  return {
    x: region.x - padding,
    y: region.y - padding,
    width: region.width + padding * 2,
    height: region.height + padding * 2
  }
}

function frameDrawnBy(window: BrowserWindow): Promise<void> {
  return new Promise((resolveDrawn, rejectDrawn) => {
    const listener = (event: IpcMainEvent): void => {
      if (event.sender === window.webContents) {
        clearTimeout(timeout)
        ipcMain.off(IpcChannel.OverlayFrameDrawn, listener)
        resolveDrawn()
      }
    }
    const timeout = setTimeout(() => {
      ipcMain.off(IpcChannel.OverlayFrameDrawn, listener)
      rejectDrawn(new Error("L'écran de sélection n'a jamais affiché la scène"))
    }, FRAME_DRAWN_TIMEOUT_MS)
    ipcMain.on(IpcChannel.OverlayFrameDrawn, listener)
  })
}

function dragSelection(window: BrowserWindow, region: Region): void {
  const start = { x: region.x, y: region.y }
  const end = { x: region.x + region.width, y: region.y + region.height }
  window.webContents.sendInputEvent({ type: 'mouseDown', ...start, button: 'left', clickCount: 1 })
  window.webContents.sendInputEvent({ type: 'mouseMove', ...end, button: 'left' })
  window.webContents.sendInputEvent({ type: 'mouseUp', ...end, button: 'left', clickCount: 1 })
}

async function photographSelection(scene: Scene, path: string): Promise<void> {
  const window = createOffscreenWindow(SCENE_SIZE, rendererWebPreferences('overlay'))
  const frameDrawn = frameDrawnBy(window)
  await loadRendererPage(window, 'overlay')
  window.webContents.send(IpcChannel.OverlayFrame, scene.frame)
  await frameDrawn
  dragSelection(window, paddedRegion(scene.heroRegion, SELECTION_PADDING_PIXELS))
  await waitForPage(window, ACTION_BAR_SHOWN)
  await savePageImage(window, path)
}

async function photographHistory(path: string): Promise<void> {
  const window = createOffscreenWindow(HISTORY_SIZE, rendererWebPreferences('history'))
  registerHistoryIpc((contents) => contents === window.webContents)
  await loadRendererPage(window, 'history')
  await waitForPage(window, VISIBLE_THUMBNAILS_LOADED)
  await savePageImage(window, path)
}

async function photographReadme(outputDirectory: string, workspace: string): Promise<void> {
  try {
    serveCaptureFiles()
    await mkdir(outputDirectory, { recursive: true })
    const scene = await renderScene()
    await seedHistory(scene)
    await photographSelection(scene, join(outputDirectory, 'hero.png'))
    await photographHistory(join(outputDirectory, 'history.png'))
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

export function runScreenshotMode(outputDirectory: string): void {
  const workspace = mkdtempSync(join(tmpdir(), 'cliche-screenshots-'))
  app.setPath('userData', join(workspace, 'user-data'))
  app.setPath('pictures', join(workspace, 'pictures'))
  const target = resolve(outputDirectory)
  void app
    .whenReady()
    .then(() => photographReadme(target, workspace))
    .then(
      () => {
        console.log(`Captures du README enregistrées dans ${target}`)
        app.quit()
      },
      (error: unknown) => {
        console.error('Les captures du README ont échoué', error)
        app.exit(1)
      }
    )
}
