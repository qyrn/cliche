import { pixelate } from '../../shared/pixelate'
import type { Region } from '../../shared/types'

export interface FrozenScreen {
  show(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): void
  addBlur(area: Region): void
  removeLastBlur(): void
  blurs(): Region[]
  clear(): void
}

export function frozenScreen(context: CanvasRenderingContext2D): FrozenScreen {
  let original = new Uint8ClampedArray(0)
  let size = { width: 0, height: 0 }
  let blurAreas: Region[] = []

  const repaint = (): void => {
    const pixels = new Uint8ClampedArray(original)
    for (const area of blurAreas) {
      pixelate(pixels, size.width, area)
    }
    context.putImageData(new ImageData(pixels, size.width, size.height), 0, 0)
  }

  return {
    show(pixels, width, height) {
      original = pixels
      size = { width, height }
      blurAreas = []
      repaint()
    },
    addBlur(area) {
      blurAreas = [...blurAreas, area]
      repaint()
    },
    removeLastBlur() {
      if (blurAreas.length > 0) {
        blurAreas = blurAreas.slice(0, -1)
        repaint()
      }
    },
    blurs: () => blurAreas,
    clear() {
      blurAreas = []
      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    }
  }
}
