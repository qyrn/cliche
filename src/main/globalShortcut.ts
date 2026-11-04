import { execFile, execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { promisify } from 'node:util'
import { uiText } from './uiText'

const execFileAsync = promisify(execFile)

const COMPONENT = 'cliche'
const CAPTURE_ACTION = 'capture-region'
const QT_KEY_PRINT = 0x01000009
const PRINT_KEYS = `[([${QT_KEY_PRINT}],)]`
const KGLOBALACCEL_SET_PRESENT = '2'
const KGLOBALACCEL_IS_DEFAULT = '8'
const MONITOR_RESTART_DELAY_MS = 2000
const OWNER_LINE = /^The name org\.kde\.kglobalaccel is owned by /

let pressMonitor: ChildProcessWithoutNullStreams | null = null
let shortcutPressed: () => void = () => undefined
let releasing = false

function actionId(): string {
  return `['${COMPONENT}', '${CAPTURE_ACTION}', 'cliché', '${uiText().shortcutName.replaceAll("'", "\\'")}']`
}

function kglobalaccelArgs(method: string, ...args: string[]): string[] {
  return [
    'call',
    '--session',
    '--dest',
    'org.kde.kglobalaccel',
    '--object-path',
    '/kglobalaccel',
    '--method',
    `org.kde.KGlobalAccel.${method}`,
    ...args
  ]
}

async function bindPrintKey(): Promise<boolean> {
  await execFileAsync('gdbus', kglobalaccelArgs('doRegister', actionId()))
  await execFileAsync(
    'gdbus',
    kglobalaccelArgs('setShortcutKeys', actionId(), PRINT_KEYS, KGLOBALACCEL_IS_DEFAULT)
  )
  const { stdout } = await execFileAsync(
    'gdbus',
    kglobalaccelArgs('setShortcutKeys', actionId(), PRINT_KEYS, KGLOBALACCEL_SET_PRESENT)
  )
  return /[1-9]/.test(stdout)
}

function rebindAfterRestart(): void {
  bindPrintKey().catch((error: unknown) => console.error('Impossible de réenregistrer la touche Impr', error))
}

function startPressMonitor(): void {
  const monitor = spawn('gdbus', [
    'monitor',
    '--session',
    '--dest',
    'org.kde.kglobalaccel',
    '--object-path',
    `/component/${COMPONENT}`
  ])
  let pendingOutput = ''
  let ownerSeen = false
  monitor.stdout.on('data', (chunk: Buffer) => {
    pendingOutput += chunk.toString()
    const lines = pendingOutput.split('\n')
    pendingOutput = lines.pop() ?? ''
    for (const line of lines) {
      if (OWNER_LINE.test(line)) {
        if (ownerSeen) {
          rebindAfterRestart()
        }
        ownerSeen = true
      } else if (line.includes('globalShortcutPressed') && line.includes(`'${CAPTURE_ACTION}'`)) {
        shortcutPressed()
      }
    }
  })
  monitor.on('error', (error) => console.error('Impossible de surveiller la touche Impr', error))
  monitor.on('exit', () => {
    if (pressMonitor !== monitor || releasing) {
      return
    }
    pressMonitor = null
    setTimeout(() => {
      if (!releasing) {
        startPressMonitor()
        rebindAfterRestart()
      }
    }, MONITOR_RESTART_DELAY_MS)
  })
  pressMonitor = monitor
}

export async function registerCaptureShortcut(onPress: () => void): Promise<boolean> {
  shortcutPressed = onPress
  if (!pressMonitor) {
    startPressMonitor()
  }
  return bindPrintKey()
}

export function releaseCaptureShortcut(): void {
  releasing = true
  pressMonitor?.kill()
  try {
    execFileSync('gdbus', kglobalaccelArgs('setInactive', actionId()))
  } catch (error) {
    console.error('Impossible de libérer le raccourci KDE', error)
  }
}
