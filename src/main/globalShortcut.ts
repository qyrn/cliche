import { execFile, execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const COMPONENT = 'cliche'
const CAPTURE_ACTION = 'capture-region'
const ACTION_ID = `['${COMPONENT}', '${CAPTURE_ACTION}', 'cliché', 'Capturer une zone']`
const QT_KEY_PRINT = 0x01000009
const PRINT_KEYS = `[([${QT_KEY_PRINT}],)]`
const KGLOBALACCEL_SET_PRESENT = '2'
const KGLOBALACCEL_IS_DEFAULT = '8'

let pressMonitor: ChildProcessWithoutNullStreams | null = null

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

function watchPresses(onPress: () => void): void {
  pressMonitor?.kill()
  const monitor = spawn('gdbus', [
    'monitor',
    '--session',
    '--dest',
    'org.kde.kglobalaccel',
    '--object-path',
    `/component/${COMPONENT}`
  ])
  let pendingOutput = ''
  monitor.stdout.on('data', (chunk: Buffer) => {
    pendingOutput += chunk.toString()
    const lines = pendingOutput.split('\n')
    pendingOutput = lines.pop() ?? ''
    if (
      lines.some((line) => line.includes('globalShortcutPressed') && line.includes(`'${CAPTURE_ACTION}'`))
    ) {
      onPress()
    }
  })
  pressMonitor = monitor
}

export async function registerCaptureShortcut(onPress: () => void): Promise<boolean> {
  watchPresses(onPress)
  await execFileAsync('gdbus', kglobalaccelArgs('doRegister', ACTION_ID))
  await execFileAsync(
    'gdbus',
    kglobalaccelArgs('setShortcutKeys', ACTION_ID, PRINT_KEYS, KGLOBALACCEL_IS_DEFAULT)
  )
  const { stdout } = await execFileAsync(
    'gdbus',
    kglobalaccelArgs('setShortcutKeys', ACTION_ID, PRINT_KEYS, KGLOBALACCEL_SET_PRESENT)
  )
  return /[1-9]/.test(stdout)
}

export function releaseCaptureShortcut(): void {
  pressMonitor?.kill()
  try {
    execFileSync('gdbus', kglobalaccelArgs('setInactive', ACTION_ID))
  } catch (error) {
    console.error('Impossible de libérer le raccourci KDE', error)
  }
}
