import { app, Menu } from 'electron'
import { prepareLaunchAtLogin } from './autostart'
import { registerCaptureFlow, startCapture } from './captureFlow'
import { onTextsRead } from './captureIndexer'
import { declareCaptureScheme, serveCaptureFiles } from './captureProtocol'
import { registerCaptureShortcut, releaseCaptureShortcut } from './globalShortcut'
import { registerHistoryIpc } from './historyIpc'
import { isHistoryWebContents, notifyTextsRead, showHistoryWindow } from './historyWindow'
import { findMissingPackages } from './missingTools'
import { notify } from './notify'
import { systemReadingLanguages } from './readingLanguages'
import { prepareOverlay } from './overlayWindow'
import { runScreenshotMode } from './screenshotMode'
import { createTray } from './tray'

const CAPTURE_FLAG = '--capture'
const HIDDEN_FLAG = '--hidden'
const screenshotDirectory = process.env['CLICHE_SCREENSHOT']

const stayInTray = (): void => undefined

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

async function warnAboutMissingTools(): Promise<void> {
  const missingPackages = await findMissingPackages(systemReadingLanguages())
  if (missingPackages.length > 0) {
    notify(
      'Il manque des outils à cliché',
      `Installe ${missingPackages.join(', ')} pour que la copie et la lecture du texte marchent.`
    )
  }
}

declareCaptureScheme()
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event) => event.preventDefault())
})

if (screenshotDirectory) {
  runScreenshotMode(screenshotDirectory)
} else if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => handleLaunchArguments(argv))
  app.on('window-all-closed', stayInTray)
  app.on('will-quit', releaseCaptureShortcut)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => app.quit())
  }
  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)
    serveCaptureFiles()
    prepareOverlay()
    registerCaptureFlow()
    registerHistoryIpc(isHistoryWebContents)
    onTextsRead(notifyTextsRead)
    await prepareLaunchAtLogin().catch((error: unknown) =>
      console.error('Impossible de préparer le lancement au démarrage', error)
    )
    await createTray(() => app.quit())
    void warnAboutMissingTools()
    await bindPrintKey()
    handleLaunchArguments(process.argv)
  })
}
