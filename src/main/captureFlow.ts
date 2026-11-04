import { homedir } from 'node:os'
import { relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { ipcMain, type IpcMainEvent, type NativeImage } from 'electron'
import { pixelate } from '../shared/pixelate'
import { IpcChannel } from '../shared/types'
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
import { grabActiveScreen, type CapturedFrame } from './screenGrab'
import { copyTextFromImage } from './textRecognition'

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
    revealWatchdog = setTimeout(
      () => abandonCapture("L'écran de sélection n'a pas répondu, réessaie."),
      REVEAL_TIMEOUT_MS
    )
  } catch (error) {
    overlayBusy = false
    notify('La capture a échoué', errorMessage(error))
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
    notify('La capture a échoué', reason)
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
    throw new Error('Aucune capture en cours')
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
  await saveCapture(png)
  notifyHistoryChanged()
  const folder = relative(homedir(), captureDirectory())
  notify('Capture copiée', `Tu la retrouves aussi dans ${folder}.`, { image, onClick: showHistoryWindow })
}

async function readTextFrom(image: NativeImage): Promise<void> {
  try {
    const text = await copyTextFromImage(image.toPNG())
    if (text) {
      notify('Texte copié', previewOf(text))
    } else {
      notify('Aucun texte trouvé', 'Essaie avec une zone plus large ou un texte plus net.')
    }
  } catch (error) {
    notify('La lecture du texte a échoué', errorMessage(error))
  }
}

function fromOverlay(handler: (payload: unknown) => Promise<void> | void) {
  return (event: IpcMainEvent, payload: unknown): void => {
    if (!isOverlayWebContents(event.sender)) {
      return
    }
    Promise.resolve()
      .then(() => handler(payload))
      .catch((error: unknown) => notify('Quelque chose a planté', errorMessage(error)))
  }
}

export function registerCaptureFlow(): void {
  onOverlayLost(() => abandonCapture("L'écran de sélection a planté, réessaie."))
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
  ipcMain.on(
    IpcChannel.OverlayReadText,
    fromOverlay(async (payload) => readTextFrom(await takeRegion(payload)))
  )
}
