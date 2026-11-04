import type { Region } from '../../shared/types'

const DIM_COLOR = 'rgb(12 14 16 / 0.55)'
const PENCIL_COLOR = '#f2c230'
const OUTLINE_COLOR = 'rgb(10 10 10 / 0.7)'

function frameAround(
  context: CanvasRenderingContext2D,
  rect: Region,
  thickness: number,
  color: string
): void {
  context.fillStyle = color
  const left = rect.x - thickness
  const top = rect.y - thickness
  const outerWidth = rect.width + thickness * 2
  context.fillRect(left, top, outerWidth, thickness)
  context.fillRect(left, rect.y + rect.height, outerWidth, thickness)
  context.fillRect(left, rect.y, thickness, rect.height)
  context.fillRect(rect.x + rect.width, rect.y, thickness, rect.height)
}

function drawHandles(context: CanvasRenderingContext2D, rect: Region, size: number): void {
  const corners = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height]
  ] as const
  for (const [x, y] of corners) {
    const left = Math.round(x - size / 2)
    const top = Math.round(y - size / 2)
    context.fillStyle = OUTLINE_COLOR
    context.fillRect(left - 1, top - 1, size + 2, size + 2)
    context.fillStyle = PENCIL_COLOR
    context.fillRect(left, top, size, size)
  }
}

function outline(context: CanvasRenderingContext2D, region: Region, pixelsPerCssPixel: number): void {
  context.clearRect(region.x, region.y, region.width, region.height)
  const lineWidth = Math.max(1, Math.round(1.5 * pixelsPerCssPixel))
  frameAround(context, region, lineWidth, PENCIL_COLOR)
  frameAround(
    context,
    {
      x: region.x - lineWidth,
      y: region.y - lineWidth,
      width: region.width + lineWidth * 2,
      height: region.height + lineWidth * 2
    },
    1,
    OUTLINE_COLOR
  )
}

export function paintShade(
  context: CanvasRenderingContext2D,
  selection: Region | null,
  hoveredWindow: Region | null,
  pixelsPerCssPixel: number
): void {
  const { canvas } = context
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = DIM_COLOR
  context.fillRect(0, 0, canvas.width, canvas.height)
  const highlighted = selection ?? hoveredWindow
  if (!highlighted) {
    return
  }
  outline(context, highlighted, pixelsPerCssPixel)
  if (selection) {
    drawHandles(context, selection, Math.round(7 * pixelsPerCssPixel))
  }
}
