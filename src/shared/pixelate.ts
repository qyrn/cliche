import type { Region } from './types'

const MIN_BLOCK_PIXELS = 12
const BLOCKS_ACROSS_SHORT_SIDE = 3

export function blockSizeFor(area: Region): number {
  return Math.max(MIN_BLOCK_PIXELS, Math.round(Math.min(area.width, area.height) / BLOCKS_ACROSS_SHORT_SIDE))
}

function averageBlock(pixels: Uint8Array | Uint8ClampedArray, frameWidth: number, block: Region): void {
  const totals = [0, 0, 0]
  for (let y = block.y; y < block.y + block.height; y++) {
    for (let x = block.x; x < block.x + block.width; x++) {
      const offset = (y * frameWidth + x) * 4
      for (let channel = 0; channel < 3; channel++) {
        totals[channel] = (totals[channel] ?? 0) + (pixels[offset + channel] ?? 0)
      }
    }
  }
  const count = block.width * block.height
  const average = totals.map((total) => Math.round(total / count))
  for (let y = block.y; y < block.y + block.height; y++) {
    for (let x = block.x; x < block.x + block.width; x++) {
      const offset = (y * frameWidth + x) * 4
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = average[channel] ?? 0
      }
    }
  }
}

export function pixelate(pixels: Uint8Array | Uint8ClampedArray, frameWidth: number, area: Region): void {
  const size = blockSizeFor(area)
  const right = area.x + area.width
  const bottom = area.y + area.height
  for (let top = area.y; top < bottom; top += size) {
    for (let left = area.x; left < right; left += size) {
      averageBlock(pixels, frameWidth, {
        x: left,
        y: top,
        width: Math.min(size, right - left),
        height: Math.min(size, bottom - top)
      })
    }
  }
}
