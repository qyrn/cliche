import { Menu, Tray, shell } from 'electron'
import { canLaunchAtLogin, isLaunchedAtLogin, setLaunchAtLogin } from './autostart'
import { captureDirectory } from './captureStore'
import { startCapture } from './captureFlow'
import { showHistoryWindow } from './historyWindow'
import { resourcePath } from './resourcePath'
import { uiText } from './uiText'

let tray: Tray | null = null

export async function createTray(onQuit: () => void): Promise<void> {
  const launchedAtLogin = canLaunchAtLogin() && (await isLaunchedAtLogin())
  const text = uiText()
  tray = new Tray(resourcePath('tray', 'tray.png'))
  tray.setToolTip('cliché')
  tray.on('click', showHistoryWindow)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: text.trayCapture, click: () => void startCapture() },
      { label: text.trayHistory, click: showHistoryWindow },
      { label: text.trayOpenFolder, click: () => void shell.openPath(captureDirectory()) },
      { type: 'separator' },
      {
        label: text.trayLaunchAtLogin,
        type: 'checkbox',
        checked: launchedAtLogin,
        visible: canLaunchAtLogin(),
        click: (item) =>
          void setLaunchAtLogin(item.checked).catch((error: unknown) =>
            console.error('Impossible de changer le lancement au démarrage', error)
          )
      },
      { label: text.trayQuit, click: onQuit }
    ])
  )
}
