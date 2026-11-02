import type { Region } from '../../shared/types'

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

export type DragZone = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const ZONE_CURSORS: Record<DragZone, string> = {
  move: 'move',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function regionFromEdges(left: number, top: number, right: number, bottom: number, bounds: Bounds): Region {
  const x1 = clamp(Math.round(Math.min(left, right)), 0, bounds.width)
  const x2 = clamp(Math.round(Math.max(left, right)), 0, bounds.width)
  const y1 = clamp(Math.round(Math.min(top, bottom)), 0, bounds.height)
  const y2 = clamp(Math.round(Math.max(top, bottom)), 0, bounds.height)
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

export function regionBetween(anchor: Point, current: Point, bounds: Bounds): Region {
  return regionFromEdges(anchor.x, anchor.y, current.x, current.y, bounds)
}

export function zoneAt(rect: Region, point: Point, grabMargin: number): DragZone | null {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const withinX = point.x >= rect.x - grabMargin && point.x <= right + grabMargin
  const withinY = point.y >= rect.y - grabMargin && point.y <= bottom + grabMargin
  if (!withinX || !withinY) {
    return null
  }
  const vertical =
    Math.abs(point.y - rect.y) <= grabMargin ? 'n' : Math.abs(point.y - bottom) <= grabMargin ? 's' : ''
  const horizontal =
    Math.abs(point.x - rect.x) <= grabMargin ? 'w' : Math.abs(point.x - right) <= grabMargin ? 'e' : ''
  const edgeZone = `${vertical}${horizontal}`
  if (edgeZone) {
    return edgeZone as DragZone
  }
  const inside = point.x > rect.x && point.x < right && point.y > rect.y && point.y < bottom
  return inside ? 'move' : null
}

export function cursorFor(zone: DragZone | null): string {
  return zone ? ZONE_CURSORS[zone] : 'crosshair'
}

export function adjustRegion(
  original: Region,
  zone: DragZone,
  deltaX: number,
  deltaY: number,
  bounds: Bounds
): Region {
  if (zone === 'move') {
    return {
      ...original,
      x: Math.round(clamp(original.x + deltaX, 0, bounds.width - original.width)),
      y: Math.round(clamp(original.y + deltaY, 0, bounds.height - original.height))
    }
  }
  let left = original.x
  let top = original.y
  let right = original.x + original.width
  let bottom = original.y + original.height
  if (zone.includes('n')) {
    top += deltaY
  }
  if (zone.includes('s')) {
    bottom += deltaY
  }
  if (zone.includes('w')) {
    left += deltaX
  }
  if (zone.includes('e')) {
    right += deltaX
  }
  return regionFromEdges(left, top, right, bottom, bounds)
}
