import { readFile, rename, writeFile } from 'node:fs/promises'
import type { CaptureEntry } from '../shared/types'

interface StoredText {
  modifiedAt: number
  text: string
}

export interface TextIndex {
  textOf(entry: CaptureEntry): string | undefined
  remember(entry: CaptureEntry, text: string): void
  keepOnly(names: Set<string>): void
  textsOf(entries: CaptureEntry[]): Record<string, string>
  save(): Promise<void>
}

function isStoredText(value: unknown): value is StoredText {
  return (
    typeof value === 'object' &&
    value !== null &&
    'modifiedAt' in value &&
    'text' in value &&
    typeof value.modifiedAt === 'number' &&
    typeof value.text === 'string'
  )
}

async function readStoredTexts(filePath: string): Promise<Map<string, StoredText>> {
  const stored = new Map<string, StoredText>()
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null) {
      for (const [name, value] of Object.entries(parsed)) {
        if (isStoredText(value)) {
          stored.set(name, value)
        }
      }
    }
  } catch {
    return stored
  }
  return stored
}

export async function openTextIndex(filePath: string): Promise<TextIndex> {
  const stored = await readStoredTexts(filePath)

  const textOf = (entry: CaptureEntry): string | undefined => {
    const known = stored.get(entry.name)
    return known?.modifiedAt === entry.takenAt ? known.text : undefined
  }

  return {
    textOf,
    remember(entry, text) {
      stored.set(entry.name, { modifiedAt: entry.takenAt, text })
    },
    keepOnly(names) {
      for (const name of stored.keys()) {
        if (!names.has(name)) {
          stored.delete(name)
        }
      }
    },
    textsOf(entries) {
      return Object.fromEntries(
        entries.flatMap((entry) => {
          const text = textOf(entry)
          return text === undefined ? [] : [[entry.name, text]]
        })
      )
    },
    async save() {
      const draftPath = `${filePath}.tmp`
      await writeFile(draftPath, JSON.stringify(Object.fromEntries(stored)))
      await rename(draftPath, filePath)
    }
  }
}
