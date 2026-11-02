import { nativeImage, type NativeImage } from 'electron'
import type { Region } from '../shared/types'
import type { CapturedFrame } from './screenGrab'

const OPAQUE_ALPHA = 0xff000000

function isRegion(value: unknown): value is Region {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate: Partial<Record<keyof Region, unknown>> = value
  return [candidate.x, candidate.y, candidate.width, candidate.height].every(Number.isInteger)
}

export function toRegionWithin(payload: unknown, frame: CapturedFrame): Region {
  if (
    !isRegion(payload) ||
    payload.x < 0 ||
    payload.y < 0 ||
    payload.width < 1 ||
    payload.height < 1 ||
    payload.x + payload.width > frame.width ||
    payload.y + payload.height > frame.height
  ) {
    throw new Error('Zone de capture invalide')
  }
  return payload
}

function cropAsBgra(frame: CapturedFrame, region: Region): Buffer {
  const cropped = Buffer.allocUnsafe(region.width * region.height * 4)
  let targetOffset = 0
  for (let row = region.y; row < region.y + region.height; row++) {
    const rowEnd = (row * frame.width + region.x + region.width) * 4
    for (let sourceOffset = (row * frame.width + region.x) * 4; sourceOffset < rowEnd; sourceOffset += 4) {
      const rgba = frame.pixels.readUInt32LE(sourceOffset)
      const bgra = OPAQUE_ALPHA | ((rgba & 0xff) << 16) | (rgba & 0xff00) | ((rgba >>> 16) & 0xff)
      cropped.writeUInt32LE(bgra >>> 0, targetOffset)
      targetOffset += 4
    }
  }
  return cropped
}

export function imageOfRegion(frame: CapturedFrame, region: Region): NativeImage {
  return nativeImage.createFromBitmap(cropAsBgra(frame, region), {
    width: region.width,
    height: region.height
  })
}
