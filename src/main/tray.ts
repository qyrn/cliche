import { Menu, Tray, shell } from 'electron'
import { canLaunchAtLogin, isLaunchedAtLogin, setLaunchAtLogin } from './autostart'
import { captureDirectory } from './captureStore'
import { startCapture } from './captureFlow'
import { showHistoryWindow } from './historyWindow'
import { resourcePath } from './resourcePath'

let tray: Tray | null = null

export async function createTray(onQuit: () => void): Promise<void> {
  const launchedAtLogin = canLaunchAtLogin() && (await isLaunchedAtLogin())
  tray = new Tray(resourcePath('tray', 'tray.png'))
  tray.setToolTip('cliché')
  tray.on('click', showHistoryWindow)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Capturer une zone', click: () => void startCapture() },
      { label: 'Historique', click: showHistoryWindow },
      { label: 'Ouvrir le dossier', click: () => void shell.openPath(captureDirectory()) },
      { type: 'separator' },
      {
        label: "Lancer à l'ouverture de session",
        type: 'checkbox',
        checked: launchedAtLogin,
        visible: canLaunchAtLogin(),
        click: (item) =>
          void setLaunchAtLogin(item.checked).catch((error: unknown) =>
            console.error('Impossible de changer le lancement au démarrage', error)
          )
      },
      { label: 'Quitter', click: onQuit }
    ])
  )
}
