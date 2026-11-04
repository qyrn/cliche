import { describe, expect, it } from 'vitest'
import { placeLoupe } from './magnifier'

const box = { width: 122, height: 146 }
const viewport = { width: 1440, height: 900 }

describe('placeLoupe', () => {
  it('sits below and to the right of the cursor', () => {
    expect(placeLoupe({ x: 400, y: 300 }, box, viewport)).toEqual({ x: 418, y: 318 })
  })

  it('flips to the other side near the right and bottom edges', () => {
    expect(placeLoupe({ x: 1400, y: 880 }, box, viewport)).toEqual({ x: 1260, y: 716 })
  })

  it('never leaves the screen in a corner', () => {
    expect(placeLoupe({ x: 0, y: 0 }, { width: 2000, height: 1000 }, viewport)).toEqual({ x: 8, y: 8 })
  })
})
