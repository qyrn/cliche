import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { resourcePath } from './resourcePath'

const CONFIGURED_MARKER = 'autostart-configured'

function autostartPath(): string {
  const configHome = process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config')
  return join(configHome, 'autostart', 'cliche.desktop')
}

function autostartEntry(): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=cliché',
    `Exec="${process.execPath}" --hidden`,
    `Icon=${resourcePath('icon.png')}`,
    'NoDisplay=true',
    'Terminal=false',
    ''
  ].join('\n')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export function canLaunchAtLogin(): boolean {
  return app.isPackaged
}

export function isLaunchedAtLogin(): Promise<boolean> {
  return exists(autostartPath())
}

export async function setLaunchAtLogin(enabled: boolean): Promise<void> {
  const path = autostartPath()
  if (enabled) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, autostartEntry())
  } else {
    await rm(path, { force: true })
  }
}

export async function prepareLaunchAtLogin(): Promise<void> {
  if (!canLaunchAtLogin()) {
    return
  }
  const marker = join(app.getPath('userData'), CONFIGURED_MARKER)
  const firstRun = !(await exists(marker))
  if (firstRun || (await isLaunchedAtLogin())) {
    await setLaunchAtLogin(true)
  }
  if (firstRun) {
    await writeFile(marker, '')
  }
}
