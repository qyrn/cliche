import { describe, expect, it } from 'vitest'
import { blockSizeFor, pixelate } from './pixelate'

function frameOf(width: number, height: number, colorAt: (x: number, y: number) => number): Uint8Array {
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      pixels.fill(colorAt(x, y), offset, offset + 3)
      pixels[offset + 3] = 255
    }
  }
  return pixels
}

function grayAt(pixels: Uint8Array, width: number, x: number, y: number): number | undefined {
  return pixels[(y * width + x) * 4]
}

describe('blockSizeFor', () => {
  it('uses big blocks so blurred text stays unreadable', () => {
    expect(blockSizeFor({ x: 0, y: 0, width: 300, height: 24 })).toBe(12)
    expect(blockSizeFor({ x: 0, y: 0, width: 600, height: 300 })).toBe(100)
  })
})

describe('pixelate', () => {
  it('replaces each block by its average color', () => {
    const pixels = frameOf(12, 12, (x) => (x < 6 ? 0 : 200))
    pixelate(pixels, 12, { x: 0, y: 0, width: 12, height: 12 })
    expect(grayAt(pixels, 12, 0, 0)).toBe(100)
    expect(grayAt(pixels, 12, 11, 11)).toBe(100)
  })

  it('leaves the pixels around the area and the alpha alone', () => {
    const pixels = frameOf(16, 16, (x, y) => (x + y) * 4)
    pixelate(pixels, 16, { x: 2, y: 2, width: 12, height: 12 })
    expect(grayAt(pixels, 16, 1, 1)).toBe(8)
    expect(grayAt(pixels, 16, 15, 15)).toBe(120)
    expect(pixels[(5 * 16 + 5) * 4 + 3]).toBe(255)
  })
})
