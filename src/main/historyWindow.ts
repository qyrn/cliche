import { BrowserWindow, type WebContents } from 'electron'
import { IpcChannel, type KnownTexts } from '../shared/types'
import { loadRendererPage, rendererWebPreferences } from './rendererPage'
import { resourcePath } from './resourcePath'

let historyWindow: BrowserWindow | null = null

export function showHistoryWindow(): void {
  if (historyWindow) {
    historyWindow.show()
    historyWindow.focus()
    return
  }
  const window = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 520,
    minHeight: 400,
    show: false,
    title: 'cliché',
    icon: resourcePath('icon.png'),
    backgroundColor: '#202326',
    autoHideMenuBar: true,
    webPreferences: rendererWebPreferences('history')
  })
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    historyWindow = null
  })
  historyWindow = window
  void loadRendererPage(window, 'history')
}

export function isHistoryWebContents(contents: WebContents): boolean {
  return historyWindow?.webContents === contents
}

export function notifyHistoryChanged(): void {
  historyWindow?.webContents.send(IpcChannel.HistoryChanged)
}

export function notifyTextsRead(update: KnownTexts): void {
  historyWindow?.webContents.send(IpcChannel.HistoryTextsRead, update)
}
