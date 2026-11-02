import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { app } from 'electron'
import type { CaptureEntry } from '../shared/types'

const CAPTURE_EXTENSION = '.png'

export function captureDirectory(): string {
  return join(app.getPath('pictures'), 'Screenshots')
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function timestampedName(date: Date, attempt: number): string {
  const day = `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
  const time = `${twoDigits(date.getHours())}-${twoDigits(date.getMinutes())}-${twoDigits(date.getSeconds())}`
  const suffix = attempt === 0 ? '' : `_${attempt + 1}`
  return `${day}_${time}${suffix}.png`
}

function isFileAlreadyThere(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST'
}

export async function saveCapture(png: Buffer): Promise<string> {
  const directory = captureDirectory()
  await mkdir(directory, { recursive: true })
  const now = new Date()
  for (let attempt = 0; ; attempt++) {
    const path = join(directory, timestampedName(now, attempt))
    try {
      await writeFile(path, png, { flag: 'wx' })
      return path
    } catch (error) {
      if (!isFileAlreadyThere(error)) {
        throw error
      }
    }
  }
}

export function resolveCapturePath(name: unknown): string {
  if (
    typeof name !== 'string' ||
    name !== basename(name) ||
    name.startsWith('.') ||
    extname(name).toLowerCase() !== CAPTURE_EXTENSION
  ) {
    throw new Error('Nom de capture invalide')
  }
  return join(captureDirectory(), name)
}

export async function listCaptures(): Promise<CaptureEntry[]> {
  const directory = captureDirectory()
  const files = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const entries = await Promise.all(
    files
      .filter((file) => file.isFile() && extname(file.name).toLowerCase() === CAPTURE_EXTENSION)
      .map(async (file) => ({ name: file.name, takenAt: (await stat(join(directory, file.name))).mtimeMs }))
  )
  return entries.sort((first, second) => second.takenAt - first.takenAt)
}
