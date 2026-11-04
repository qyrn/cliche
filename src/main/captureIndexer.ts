import { readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app } from 'electron'
import type { CaptureEntry, KnownTexts } from '../shared/types'
import { resolveCapturePath } from './captureStore'
import { MissingToolError } from './systemTools'
import { openTextIndex, type TextIndex } from './textIndex'
import { recognizeText } from './textRecognition'

const SAVE_DELAY_MS = 2000

let index: Promise<TextIndex> | null = null
let queue: CaptureEntry[] = []
let reading = false
let saveTimer: NodeJS.Timeout | undefined
let textsReadListener: (update: KnownTexts) => void = () => undefined

function textIndex(): Promise<TextIndex> {
  index ??= openTextIndex(join(app.getPath('userData'), 'text-index.json'))
  return index
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function scheduleSave(loaded: TextIndex): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    loaded
      .save()
      .catch((error: unknown) => console.error("Impossible d'enregistrer le texte des captures", error))
  }, SAVE_DELAY_MS)
}

async function entryOf(path: string): Promise<CaptureEntry> {
  const { mtimeMs } = await stat(path)
  return { name: basename(path), takenAt: mtimeMs }
}

async function readQueuedEntry(entry: CaptureEntry): Promise<string | null> {
  try {
    return await recognizeText(await readFile(resolveCapturePath(entry.name)))
  } catch (error) {
    if (error instanceof MissingToolError) {
      throw error
    }
    if (isMissingFile(error)) {
      return null
    }
    console.error(`Impossible de lire le texte de ${entry.name}`, error)
    return ''
  }
}

async function drainQueue(): Promise<void> {
  if (reading) {
    return
  }
  reading = true
  try {
    const loaded = await textIndex()
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      const text = await readQueuedEntry(entry)
      if (text !== null) {
        loaded.remember(entry, text)
        scheduleSave(loaded)
      }
      textsReadListener({ texts: { [entry.name]: text ?? '' }, remaining: queue.length })
    }
  } catch (error) {
    queue = []
    textsReadListener({ texts: {}, remaining: 0 })
    console.error('Lecture du texte des captures arrêtée', error)
  } finally {
    reading = false
  }
}

export function onTextsRead(listener: (update: KnownTexts) => void): void {
  textsReadListener = listener
}

export async function queueUnreadCaptures(entries: CaptureEntry[]): Promise<void> {
  const loaded = await textIndex()
  loaded.keepOnly(new Set(entries.map((entry) => entry.name)))
  const waiting = new Set(queue.map((entry) => entry.name))
  queue.push(...entries.filter((entry) => !waiting.has(entry.name) && loaded.textOf(entry) === undefined))
  void drainQueue()
}

export async function readNewCaptureFirst(path: string): Promise<void> {
  queue.unshift(await entryOf(path))
  void drainQueue()
}

export async function knownTexts(entries: CaptureEntry[]): Promise<KnownTexts> {
  return { texts: (await textIndex()).textsOf(entries), remaining: queue.length }
}

export async function textOfCapture(name: unknown): Promise<string> {
  const path = resolveCapturePath(name)
  const entry = await entryOf(path)
  const loaded = await textIndex()
  const known = loaded.textOf(entry)
  if (known !== undefined) {
    return known
  }
  const text = await recognizeText(await readFile(path))
  loaded.remember(entry, text)
  scheduleSave(loaded)
  return text
}
