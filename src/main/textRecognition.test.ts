import { describe, expect, it, vi } from 'vitest'
import { readingScaleFor } from './textRecognition'

vi.mock('electron', () => ({ nativeImage: {} }))

describe('readingScaleFor', () => {
  it('triples small zones so Tesseract sees bigger letters', () => {
    expect(readingScaleFor(240, 95)).toBe(3)
  })

  it('doubles a full HD screen and leaves a 4K screen alone', () => {
    expect(readingScaleFor(1920, 1080)).toBe(2)
    expect(readingScaleFor(3840, 2160)).toBe(1)
  })
})
