import { homedir } from 'node:os'
import { relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { ipcMain, type IpcMainEvent, type NativeImage } from 'electron'
import { pixelate } from '../shared/pixelate'
import { IpcChannel, type Region } from '../shared/types'
import { readNewCaptureFirst } from './captureIndexer'
import { captureDirectory, saveCapture } from './captureStore'
import { copyPngToClipboard } from './waylandClipboard'
import { imageOfRegion, toExportRequestWithin } from './frameRegion'
import { notifyHistoryChanged, showHistoryWindow } from './historyWindow'
import { notify } from './notify'
import {
  hideOverlay,
  isOverlayWebContents,
  onOverlayLost,
  revealOverlay,
  sendFrameToOverlay,
  whenOverlayReady
} from './overlayWindow'
import { scanFrameForPersonalInfo } from './personalInfoScan'
import { grabActiveScreen, type CapturedFrame } from './screenGrab'
import { copyTextFromImage } from './textRecognition'
import { uiText } from './uiText'

const TEXT_PREVIEW_LENGTH = 160
const REVEAL_TIMEOUT_MS = 4000

let overlayBusy = false
let pendingFrame: CapturedFrame | null = null
let revealWatchdog: NodeJS.Timeout | undefined

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function previewOf(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ')
  return singleLine.length > TEXT_PREVIEW_LENGTH ? `${singleLine.slice(0, TEXT_PREVIEW_LENGTH)}…` : singleLine
}

export async function startCapture(): Promise<void> {
  if (overlayBusy) {
    return
  }
  overlayBusy = true
  try {
    await whenOverlayReady()
    pendingFrame = await grabActiveScreen()
    sendFrameToOverlay(pendingFrame)
    revealWatchdog = setTimeout(() => abandonCapture(uiText().overlayUnresponsive), REVEAL_TIMEOUT_MS)
  } catch (error) {
    overlayBusy = false
    notify(uiText().captureFailed, errorMessage(error))
  }
}

function closeOverlay(): CapturedFrame | null {
  clearTimeout(revealWatchdog)
  const frame = pendingFrame
  pendingFrame = null
  hideOverlay()
  overlayBusy = false
  return frame
}

function abandonCapture(reason: string): void {
  if (overlayBusy) {
    closeOverlay()
    notify(uiText().captureFailed, reason)
  }
}

function revealDrawnFrame(): void {
  clearTimeout(revealWatchdog)
  if (pendingFrame) {
    revealOverlay()
  }
}

async function takeRegion(payload: unknown): Promise<NativeImage> {
  const frame = closeOverlay()
  if (!frame) {
    throw new Error(uiText().noCaptureInProgress)
  }
  const request = toExportRequestWithin(payload, frame)
  for (const blur of request.blurs) {
    pixelate(frame.pixels, frame.width, blur)
  }
  await delay(0)
  return imageOfRegion(frame, request.region)
}

async function copyAndSave(image: NativeImage): Promise<void> {
  const png = image.toPNG()
  await copyPngToClipboard(png)
  const path = await saveCapture(png)
  readNewCaptureFirst(path).catch((error: unknown) =>
    console.error('Impossible de lire cette capture', error)
  )
  notifyHistoryChanged()
  const folder = relative(homedir(), captureDirectory())
  notify(uiText().captureCopied, uiText().captureAlsoIn(folder), { image, onClick: showHistoryWindow })
}

async function readTextFrom(image: NativeImage): Promise<void> {
  try {
    const text = await copyTextFromImage(image.toPNG())
    if (text) {
      notify(uiText().textCopied, previewOf(text))
    } else {
      notify(uiText().noTextFound, uiText().noTextFoundHint)
    }
  } catch (error) {
    notify(uiText().textReadingFailed, errorMessage(error))
  }
}

function personalInfoIn(payload: unknown): Promise<Region[]> {
  return pendingFrame ? scanFrameForPersonalInfo(pendingFrame, payload) : Promise.resolve([])
}

function fromOverlay(handler: (payload: unknown) => Promise<void> | void) {
  return (event: IpcMainEvent, payload: unknown): void => {
    if (!isOverlayWebContents(event.sender)) {
      return
    }
    Promise.resolve()
      .then(() => handler(payload))
      .catch((error: unknown) => notify(uiText().somethingBroke, errorMessage(error)))
  }
}

export function registerCaptureFlow(): void {
  onOverlayLost(() => abandonCapture(uiText().overlayCrashed))
  ipcMain.on(IpcChannel.OverlayFrameDrawn, fromOverlay(revealDrawnFrame))
  ipcMain.on(
    IpcChannel.OverlayDismiss,
    fromOverlay(() => {
      closeOverlay()
    })
  )
  ipcMain.on(
    IpcChannel.OverlayCopy,
    fromOverlay(async (payload) => copyAndSave(await takeRegion(payload)))
  )
  ipcMain.handle(IpcChannel.OverlayFindPersonalInfo, (event, payload: unknown) =>
    isOverlayWebContents(event.sender) ? personalInfoIn(payload) : Promise.reject(new Error('Appel refusé'))
  )
  ipcMain.on(
    IpcChannel.OverlayReadText,
    fromOverlay(async (payload) => readTextFrom(await takeRegion(payload)))
  )
}
