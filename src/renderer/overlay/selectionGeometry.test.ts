import { describe, expect, it } from 'vitest'
import { adjustRegion, cursorFor, nudgeRegion, regionBetween, windowAt, zoneAt } from './selectionGeometry'

const bounds = { width: 1000, height: 600 }
const rect = { x: 100, y: 100, width: 200, height: 100 }

describe('regionBetween', () => {
  it('normalizes a drag made from bottom right to top left', () => {
    expect(regionBetween({ x: 300, y: 200 }, { x: 100, y: 50 }, bounds)).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 150
    })
  })

  it('clamps the region to the screen', () => {
    expect(regionBetween({ x: -40, y: 500 }, { x: 1200, y: 900 }, bounds)).toEqual({
      x: 0,
      y: 500,
      width: 1000,
      height: 100
    })
  })
})

describe('zoneAt', () => {
  it('finds corners and edges within the grab margin', () => {
    expect(zoneAt(rect, { x: 98, y: 103 }, 5)).toBe('nw')
    expect(zoneAt(rect, { x: 302, y: 199 }, 5)).toBe('se')
    expect(zoneAt(rect, { x: 200, y: 97 }, 5)).toBe('n')
    expect(zoneAt(rect, { x: 304, y: 150 }, 5)).toBe('e')
  })

  it('moves from inside and ignores points outside', () => {
    expect(zoneAt(rect, { x: 200, y: 150 }, 5)).toBe('move')
    expect(zoneAt(rect, { x: 50, y: 150 }, 5)).toBeNull()
  })
})

describe('adjustRegion', () => {
  it('moves without leaving the screen', () => {
    expect(adjustRegion(rect, 'move', 900, -500, bounds)).toEqual({ ...rect, x: 800, y: 0 })
  })

  it('resizes from one edge', () => {
    expect(adjustRegion(rect, 'e', 50, 0, bounds)).toEqual({ ...rect, width: 250 })
  })

  it('flips when an edge is dragged past the opposite one', () => {
    expect(adjustRegion(rect, 'w', 300, 0, bounds)).toEqual({ x: 300, y: 100, width: 100, height: 100 })
  })
})

describe('cursorFor', () => {
  it('uses a crosshair outside any zone', () => {
    expect(cursorFor(null)).toBe('crosshair')
    expect(cursorFor('ne')).toBe('nesw-resize')
  })
})

describe('nudgeRegion', () => {
  it('moves the selection with the arrows', () => {
    expect(nudgeRegion(rect, 'ArrowLeft', 1, false, bounds)).toEqual({ ...rect, x: 99 })
    expect(nudgeRegion(rect, 'ArrowDown', 10, false, bounds)).toEqual({ ...rect, y: 110 })
  })

  it('resizes from the bottom right corner with shift', () => {
    expect(nudgeRegion(rect, 'ArrowRight', 10, true, bounds)).toEqual({ ...rect, width: 210 })
    expect(nudgeRegion({ ...rect, height: 1 }, 'ArrowUp', 10, true, bounds)).toEqual({ ...rect, height: 1 })
  })

  it('ignores keys that are not arrows', () => {
    expect(nudgeRegion(rect, 'a', 1, false, bounds)).toBeNull()
  })
})

describe('windowAt', () => {
  const panel = { x: 0, y: 560, width: 1000, height: 40 }
  const editor = { x: 50, y: 50, width: 600, height: 520 }

  it('picks the topmost window under the pointer', () => {
    expect(windowAt([panel, editor], { x: 100, y: 565 })).toBe(panel)
    expect(windowAt([panel, editor], { x: 100, y: 300 })).toBe(editor)
  })

  it('finds nothing on the bare desktop', () => {
    expect(windowAt([panel, editor], { x: 800, y: 100 })).toBeNull()
  })
})
