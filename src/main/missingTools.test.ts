import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findMissingPackages } from './missingTools'

const FAKE_TOOLS: Record<string, string> = {
  'wl-copy': 'exit 0',
  gdbus: 'exit 0',
  tesseract: 'printf \'List of available languages in "/usr/share/tessdata/" (2):\\neng\\nosd\\n\''
}

let originalPath: string | undefined
let toolsDirectory: string

beforeEach(async () => {
  originalPath = process.env['PATH']
  toolsDirectory = await mkdtemp(join(tmpdir(), 'cliche-tools-'))
})

afterEach(async () => {
  process.env['PATH'] = originalPath
  await rm(toolsDirectory, { recursive: true, force: true })
})

describe('findMissingPackages', () => {
  it('lists every package when no tool is installed', async () => {
    process.env['PATH'] = toolsDirectory
    expect(await findMissingPackages(['fra', 'eng'])).toEqual(['wl-clipboard', 'glib2', 'tesseract'])
  })

  it('lists the Tesseract languages that are missing', async () => {
    for (const [tool, script] of Object.entries(FAKE_TOOLS)) {
      const path = join(toolsDirectory, tool)
      await writeFile(path, `#!/bin/sh\n${script}\n`)
      await chmod(path, 0o755)
    }
    process.env['PATH'] = `${toolsDirectory}:/usr/bin:/bin`
    expect(await findMissingPackages(['fra', 'eng'])).toEqual(['tesseract-data-fra'])
  })
})
