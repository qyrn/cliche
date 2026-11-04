import type { Bounds, Point } from './selectionGeometry'

export const LOUPE_SAMPLE_PIXELS = 15
const LOUPE_GAP_CSS_PIXELS = 18
const SCREEN_EDGE_CSS_PIXELS = 8
const BACKDROP_COLOR = '#16181a'
const CROSSHAIR_COLOR = 'rgb(242 194 48 / 0.22)'
const PENCIL_COLOR = '#f2c230'

export function placeLoupe(cursor: Point, box: Bounds, viewport: Bounds): Point {
  const right = cursor.x + LOUPE_GAP_CSS_PIXELS
  const below = cursor.y + LOUPE_GAP_CSS_PIXELS
  const left =
    right + box.width > viewport.width - SCREEN_EDGE_CSS_PIXELS
      ? cursor.x - LOUPE_GAP_CSS_PIXELS - box.width
      : right
  const top =
    below + box.height > viewport.height - SCREEN_EDGE_CSS_PIXELS
      ? cursor.y - LOUPE_GAP_CSS_PIXELS - box.height
      : below
  return { x: Math.max(SCREEN_EDGE_CSS_PIXELS, left), y: Math.max(SCREEN_EDGE_CSS_PIXELS, top) }
}

export function paintLoupe(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  center: Point
): void {
  const { width, height } = context.canvas
  const half = Math.floor(LOUPE_SAMPLE_PIXELS / 2)
  const cell = width / LOUPE_SAMPLE_PIXELS
  context.imageSmoothingEnabled = false
  context.fillStyle = BACKDROP_COLOR
  context.fillRect(0, 0, width, height)
  context.drawImage(
    source,
    center.x - half,
    center.y - half,
    LOUPE_SAMPLE_PIXELS,
    LOUPE_SAMPLE_PIXELS,
    0,
    0,
    width,
    height
  )
  context.fillStyle = CROSSHAIR_COLOR
  context.fillRect(0, half * cell, width, cell)
  context.fillRect(half * cell, 0, cell, height)
  context.strokeStyle = PENCIL_COLOR
  context.lineWidth = Math.max(1, Math.round(cell / 6))
  context.strokeRect(half * cell, half * cell, cell, cell)
}
