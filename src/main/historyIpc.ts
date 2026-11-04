import { readFile } from 'node:fs/promises'
import {
  ipcMain,
  nativeImage,
  shell,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type WebContents
} from 'electron'
import { IpcChannel } from '../shared/types'
import { captureDirectory, listCaptures, resolveCapturePath } from './captureStore'
import { copyPngToClipboard } from './waylandClipboard'
import { copyTextFromImage } from './textRecognition'

type SenderCheck = (contents: WebContents) => boolean

const DRAG_ICON_WIDTH = 160

async function openPath(path: string): Promise<void> {
  const failure = await shell.openPath(path)
  if (failure) {
    throw new Error(failure)
  }
}

function startDragging(event: IpcMainEvent, name: unknown): void {
  const path = resolveCapturePath(name)
  const icon = nativeImage.createFromPath(path)
  if (icon.isEmpty()) {
    throw new Error(`Capture illisible : ${path}`)
  }
  event.sender.startDrag({ file: path, icon: icon.resize({ width: DRAG_ICON_WIDTH }) })
}

export function registerHistoryIpc(isHistorySender: SenderCheck): void {
  const fromHistory =
    <Result>(handler: (name: unknown) => Promise<Result>) =>
    (event: IpcMainInvokeEvent, name: unknown): Promise<Result> =>
      isHistorySender(event.sender) ? handler(name) : Promise.reject(new Error('Appel refusé'))

  ipcMain.handle(
    IpcChannel.HistoryList,
    fromHistory(() => listCaptures())
  )
  ipcMain.handle(
    IpcChannel.HistoryCopyImage,
    fromHistory(async (name) => copyPngToClipboard(await readFile(resolveCapturePath(name))))
  )
  ipcMain.handle(
    IpcChannel.HistoryReadText,
    fromHistory(async (name) => copyTextFromImage(await readFile(resolveCapturePath(name))))
  )
  ipcMain.handle(
    IpcChannel.HistoryOpen,
    fromHistory((name) => openPath(resolveCapturePath(name)))
  )
  ipcMain.handle(
    IpcChannel.HistoryOpenFolder,
    fromHistory(() => openPath(captureDirectory()))
  )
  ipcMain.handle(
    IpcChannel.HistoryTrash,
    fromHistory((name) => shell.trashItem(resolveCapturePath(name)))
  )
  ipcMain.on(IpcChannel.HistoryStartDrag, (event, name: unknown) => {
    if (!isHistorySender(event.sender)) {
      return
    }
    try {
      startDragging(event, name)
    } catch (error) {
      console.error('Impossible de glisser cette capture', error)
    }
  })
}
