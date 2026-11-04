import { describe, expect, it, vi } from 'vitest'
import { toRegionWithin } from './frameRegion'

vi.mock('electron', () => ({ nativeImage: {} }))

const frame = { width: 1920, height: 1080, pixels: Buffer.alloc(0) }

describe('toRegionWithin', () => {
  it('accepts a region inside the frame', () => {
    expect(toRegionWithin({ x: 0, y: 0, width: 1920, height: 1080 }, frame)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    })
  })

  it.each([
    ['a missing field', { x: 0, y: 0, width: 10 }],
    ['a fractional value', { x: 0.5, y: 0, width: 10, height: 10 }],
    ['an empty size', { x: 0, y: 0, width: 0, height: 10 }],
    ['a negative origin', { x: -1, y: 0, width: 10, height: 10 }],
    ['an overflow', { x: 1900, y: 0, width: 21, height: 10 }],
    ['a non object', 'everything']
  ])('rejects %s', (_label, payload) => {
    expect(() => toRegionWithin(payload, frame)).toThrow('Zone de capture invalide')
  })
})
