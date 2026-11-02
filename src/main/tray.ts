import { Menu, Tray, shell } from 'electron'
import { captureDirectory } from './captureStore'
import { startCapture } from './captureFlow'
import { showHistoryWindow } from './historyWindow'
import { resourcePath } from './resourcePath'

let tray: Tray | null = null

export function createTray(onQuit: () => void): void {
  tray = new Tray(resourcePath('tray', 'tray.png'))
  tray.setToolTip('cliché')
  tray.on('click', showHistoryWindow)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Capturer une zone', click: () => void startCapture() },
      { label: 'Historique', click: showHistoryWindow },
      { label: 'Ouvrir le dossier', click: () => void shell.openPath(captureDirectory()) },
      { type: 'separator' },
      { label: 'Quitter', click: onQuit }
    ])
  )
}
