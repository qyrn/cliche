import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openTextIndex } from './textIndex'

const recipe = { name: 'recette.png', takenAt: 1000 }
const terminal = { name: 'terminal.png', takenAt: 2000 }

let directory: string
let indexPath: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'cliche-index-'))
  indexPath = join(directory, 'text-index.json')
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('openTextIndex', () => {
  it('keeps what was read across restarts', async () => {
    const index = await openTextIndex(indexPath)
    index.remember(recipe, '250 g de farine')
    await index.save()
    const reopened = await openTextIndex(indexPath)
    expect(reopened.textOf(recipe)).toBe('250 g de farine')
    expect(reopened.textsOf([recipe, terminal])).toEqual({ 'recette.png': '250 g de farine' })
  })

  it('reads a capture again once its file changed', async () => {
    const index = await openTextIndex(indexPath)
    index.remember(recipe, 'ancien texte')
    expect(index.textOf({ ...recipe, takenAt: 1500 })).toBeUndefined()
  })

  it('forgets captures that left the folder', async () => {
    const index = await openTextIndex(indexPath)
    index.remember(recipe, 'farine')
    index.remember(terminal, 'tesseract')
    index.keepOnly(new Set(['terminal.png']))
    expect(index.textsOf([recipe, terminal])).toEqual({ 'terminal.png': 'tesseract' })
  })

  it('starts empty from a damaged file', async () => {
    await writeFile(indexPath, '{ pas du json')
    const index = await openTextIndex(indexPath)
    expect(index.textOf(recipe)).toBeUndefined()
  })
})
