import { app, Menu } from 'electron'
import { registerCaptureFlow, startCapture } from './captureFlow'
import { declareCaptureScheme, serveCaptureFiles } from './captureProtocol'
import { registerCaptureShortcut, releaseCaptureShortcut } from './globalShortcut'
import { registerHistoryIpc } from './historyIpc'
import { showHistoryWindow } from './historyWindow'
import { notify } from './notify'
import { prepareOverlay } from './overlayWindow'
import { createTray } from './tray'

const CAPTURE_FLAG = '--capture'
const HIDDEN_FLAG = '--hidden'

function handleLaunchArguments(argv: string[]): void {
  if (argv.includes(CAPTURE_FLAG)) {
    void startCapture()
  } else if (!argv.includes(HIDDEN_FLAG)) {
    showHistoryWindow()
  }
}

async function bindPrintKey(): Promise<void> {
  const bound = await registerCaptureShortcut(() => void startCapture()).catch(() => false)
  if (!bound) {
    notify(
      'La touche Impr est déjà prise',
      'Une autre app la garde pour elle. Tu peux choisir un autre raccourci dans les réglages KDE, rubrique Raccourcis.'
    )
  }
}

declareCaptureScheme()

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => handleLaunchArguments(argv))
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event) => event.preventDefault())
  })
  app.on('will-quit', releaseCaptureShortcut)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => app.quit())
  }
  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)
    serveCaptureFiles()
    prepareOverlay()
    registerCaptureFlow()
    registerHistoryIpc()
    createTray(() => app.quit())
    await bindPrintKey()
    handleLaunchArguments(process.argv)
  })
}
