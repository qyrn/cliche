import { describe, expect, it, vi } from 'vitest'
import { resolveCapturePath } from './captureStore'

vi.mock('electron', () => ({ app: { getPath: () => '/home/someone/Images' } }))

describe('resolveCapturePath', () => {
  it('resolves a capture name inside the captures folder', () => {
    expect(resolveCapturePath('2026-11-04_14-32-10.png')).toBe(
      '/home/someone/Images/Screenshots/2026-11-04_14-32-10.png'
    )
  })

  it.each([
    ['a parent folder', '../secret.png'],
    ['a sub folder', 'deeper/capture.png'],
    ['a hidden file', '.capture.png'],
    ['another extension', 'notes.txt'],
    ['a non string', 42]
  ])('refuses %s', (_label, name) => {
    expect(() => resolveCapturePath(name)).toThrow('Nom de capture invalide')
  })
})
