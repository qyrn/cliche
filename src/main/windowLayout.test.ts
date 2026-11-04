import { describe, expect, it, vi } from 'vitest'
import { windowRegionsIn } from './windowLayout'

vi.mock('electron', () => ({ app: {} }))

const frame = { width: 1920, height: 1200 }
const layout = {
  screen: { x: 0, y: 0, width: 1536, height: 960 },
  windows: [
    { x: 0, y: 0, width: 1536, height: 922.4 },
    { x: 368, y: 147, width: 800, height: 628 },
    { x: 0, y: 922, width: 1536, height: 38 }
  ]
}

describe('windowRegionsIn', () => {
  it('scales KWin coordinates to the frame and lists the top window first', () => {
    expect(windowRegionsIn(layout, frame)).toEqual([
      { x: 0, y: 1153, width: 1920, height: 47 },
      { x: 460, y: 184, width: 1000, height: 785 },
      { x: 0, y: 0, width: 1920, height: 1153 }
    ])
  })

  it('clips windows to the captured screen and drops the ones outside', () => {
    const offset = {
      screen: { x: 1536, y: 0, width: 1536, height: 960 },
      windows: [
        { x: 100, y: 100, width: 300, height: 300 },
        { x: 1400, y: -50, width: 400, height: 200 }
      ]
    }
    expect(windowRegionsIn(offset, frame)).toEqual([{ x: 0, y: 0, width: 330, height: 188 }])
  })

  it('ignores a malformed answer', () => {
    expect(windowRegionsIn({ screen: { x: 0 }, windows: [] }, frame)).toEqual([])
    expect(windowRegionsIn(null, frame)).toEqual([])
  })
})
