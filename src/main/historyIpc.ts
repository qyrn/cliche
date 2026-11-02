import { readFile } from 'node:fs/promises'
import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel } from '../shared/types'
import { captureDirectory, listCaptures, resolveCapturePath } from './captureStore'
import { copyPngToClipboard } from './waylandClipboard'
import { isHistoryWebContents } from './historyWindow'
import { copyTextFromImage } from './textRecognition'

function fromHistory<Result>(handler: (name: unknown) => Promise<Result>) {
  return (event: IpcMainInvokeEvent, name: unknown): Promise<Result> => {
    if (!isHistoryWebContents(event.sender)) {
      return Promise.reject(new Error('Appel refusé'))
    }
    return handler(name)
  }
}

async function openPath(path: string): Promise<void> {
  const failure = await shell.openPath(path)
  if (failure) {
    throw new Error(failure)
  }
}

export function registerHistoryIpc(): void {
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
}
