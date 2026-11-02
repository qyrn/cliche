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

export function paintShade(
  context: CanvasRenderingContext2D,
  selection: Region | null,
  pixelsPerCssPixel: number
): void {
  const { canvas } = context
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = DIM_COLOR
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (!selection) {
    return
  }
  context.clearRect(selection.x, selection.y, selection.width, selection.height)
  const lineWidth = Math.max(1, Math.round(1.5 * pixelsPerCssPixel))
  frameAround(context, selection, lineWidth, PENCIL_COLOR)
  frameAround(
    context,
    {
      x: selection.x - lineWidth,
      y: selection.y - lineWidth,
      width: selection.width + lineWidth * 2,
      height: selection.height + lineWidth * 2
    },
    1,
    OUTLINE_COLOR
  )
  drawHandles(context, selection, Math.round(7 * pixelsPerCssPixel))
}
