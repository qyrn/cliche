import type { Region, ScreenFrame } from '../../shared/types'
import { requireElement } from '../requireElement'
import { paintLoupe, placeLoupe } from './magnifier'
import {
  adjustRegion,
  cursorFor,
  nudgeRegion,
  regionBetween,
  zoneAt,
  type Bounds,
  type DragZone,
  type Point
} from './selectionGeometry'
import { paintShade } from './shadePainter'

type Gesture =
  | { kind: 'idle' }
  | { kind: 'drawing'; anchor: Point }
  | { kind: 'adjusting'; zone: DragZone; start: Point; original: Region }

const MIN_SELECTION_PIXELS = 4
const GRAB_MARGIN_CSS_PIXELS = 9
const FLOATING_GAP_CSS_PIXELS = 8
const SCREEN_EDGE_CSS_PIXELS = 8
const LOUPE_CSS_PIXELS = 120
const FAST_NUDGE_PIXELS = 10

const screenCanvas = requireElement('#screen', HTMLCanvasElement)
const shadeCanvas = requireElement('#shade', HTMLCanvasElement)
const sizeReadout = requireElement('#size', HTMLOutputElement)
const loupe = requireElement('#loupe', HTMLDivElement)
const loupeCanvas = requireElement('canvas', HTMLCanvasElement, loupe)
const loupeLabel = requireElement('output', HTMLOutputElement, loupe)
const actionBar = requireElement('#actions', HTMLDivElement)
const hint = requireElement('#hint', HTMLParagraphElement)
const screenContext = memoryBackedContext(screenCanvas)
const shadeContext = memoryBackedContext(shadeCanvas)
const loupeContext = memoryBackedContext(loupeCanvas)

let bounds: Bounds = { width: 0, height: 0 }
let selection: Region | null = null
let gesture: Gesture = { kind: 'idle' }

function memoryBackedContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas indisponible')
  }
  return context
}

function pixelsPerCssPixel(): number {
  return bounds.width > 0 ? bounds.width / window.innerWidth : window.devicePixelRatio
}

function framePoint(event: PointerEvent | MouseEvent): Point {
  const scale = pixelsPerCssPixel()
  return { x: event.clientX * scale, y: event.clientY * scale }
}

function sizeLoupe(): void {
  const devicePixels = Math.round(LOUPE_CSS_PIXELS * window.devicePixelRatio)
  loupeCanvas.width = devicePixels
  loupeCanvas.height = devicePixels
  loupeCanvas.style.width = `${LOUPE_CSS_PIXELS}px`
  loupeCanvas.style.height = `${LOUPE_CSS_PIXELS}px`
}

function loupeWanted(): boolean {
  return selection === null || gesture.kind !== 'idle'
}

function followWithLoupe(event: PointerEvent): void {
  if (!loupeWanted()) {
    loupe.hidden = true
    return
  }
  const point = framePoint(event)
  const pixel = {
    x: Math.min(Math.floor(point.x), bounds.width - 1),
    y: Math.min(Math.floor(point.y), bounds.height - 1)
  }
  paintLoupe(loupeContext, screenCanvas, pixel)
  loupeLabel.value = `${pixel.x}, ${pixel.y}`
  loupe.hidden = false
  const position = placeLoupe(
    { x: event.clientX, y: event.clientY },
    { width: loupe.offsetWidth, height: loupe.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight }
  )
  loupe.style.translate = `${position.x}px ${position.y}px`
}

function placeSizeReadout(rect: Region): void {
  const scale = pixelsPerCssPixel()
  sizeReadout.value = `${rect.width} × ${rect.height}`
  sizeReadout.hidden = false
  const left = rect.x / scale
  const above = rect.y / scale - sizeReadout.offsetHeight - FLOATING_GAP_CSS_PIXELS / 2
  sizeReadout.style.left = `${Math.max(left, SCREEN_EDGE_CSS_PIXELS)}px`
  sizeReadout.style.top = `${above >= SCREEN_EDGE_CSS_PIXELS ? above : rect.y / scale + FLOATING_GAP_CSS_PIXELS / 2}px`
}

function placeActionBar(rect: Region): void {
  const scale = pixelsPerCssPixel()
  actionBar.hidden = false
  const barWidth = actionBar.offsetWidth
  const barHeight = actionBar.offsetHeight
  const rectTop = rect.y / scale
  const rectBottom = (rect.y + rect.height) / scale
  const below = rectBottom + FLOATING_GAP_CSS_PIXELS
  const above = rectTop - barHeight - FLOATING_GAP_CSS_PIXELS
  const inside = rectBottom - barHeight - FLOATING_GAP_CSS_PIXELS
  const fitsBelow = below + barHeight <= window.innerHeight - SCREEN_EDGE_CSS_PIXELS
  const top = fitsBelow ? below : above >= SCREEN_EDGE_CSS_PIXELS ? above : inside
  const preferredLeft = (rect.x + rect.width) / scale - barWidth
  const maxLeft = window.innerWidth - barWidth - SCREEN_EDGE_CSS_PIXELS
  actionBar.style.left = `${Math.min(Math.max(preferredLeft, SCREEN_EDGE_CSS_PIXELS), maxLeft)}px`
  actionBar.style.top = `${top}px`
}

function render(): void {
  paintShade(shadeContext, selection, pixelsPerCssPixel())
  hint.hidden = selection !== null || gesture.kind !== 'idle'
  if (selection) {
    placeSizeReadout(selection)
  } else {
    sizeReadout.hidden = true
  }
  if (selection && gesture.kind === 'idle') {
    placeActionBar(selection)
  } else {
    actionBar.hidden = true
  }
  if (!loupeWanted()) {
    loupe.hidden = true
  }
}

function resetSelection(): void {
  selection = null
  gesture = { kind: 'idle' }
  shadeCanvas.style.cursor = cursorFor(null)
  loupe.hidden = true
  render()
}

function showFrame(frame: ScreenFrame): void {
  bounds = { width: frame.width, height: frame.height }
  for (const canvas of [screenCanvas, shadeCanvas]) {
    canvas.width = frame.width
    canvas.height = frame.height
  }
  const { buffer, byteOffset, byteLength } = frame.pixels
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error('Image reçue dans un format inattendu')
  }
  const pixels = new Uint8ClampedArray(buffer, byteOffset, byteLength)
  screenContext.putImageData(new ImageData(pixels, frame.width, frame.height), 0, 0)
  resetSelection()
  window.overlay.frameDrawn()
}

function regionToExport(): Region {
  return selection ?? { x: 0, y: 0, width: bounds.width, height: bounds.height }
}

function clearOverlay(): void {
  resetSelection()
  screenContext.clearRect(0, 0, screenCanvas.width, screenCanvas.height)
}

function close(): void {
  clearOverlay()
  window.overlay.dismiss()
}

function finishWith(send: (region: Region) => void): void {
  const region = regionToExport()
  clearOverlay()
  send(region)
}

function copyRegion(): void {
  finishWith(window.overlay.copy)
}

function readRegionText(): void {
  finishWith(window.overlay.readText)
}

shadeCanvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return
  }
  shadeCanvas.setPointerCapture(event.pointerId)
  const point = framePoint(event)
  const zone = selection ? zoneAt(selection, point, GRAB_MARGIN_CSS_PIXELS * pixelsPerCssPixel()) : null
  if (selection && zone) {
    gesture = { kind: 'adjusting', zone, start: point, original: selection }
  } else {
    gesture = { kind: 'drawing', anchor: point }
    selection = regionBetween(point, point, bounds)
  }
  render()
  followWithLoupe(event)
})

shadeCanvas.addEventListener('pointermove', (event) => {
  const point = framePoint(event)
  if (gesture.kind === 'drawing') {
    selection = regionBetween(gesture.anchor, point, bounds)
    render()
  } else if (gesture.kind === 'adjusting') {
    const deltaX = point.x - gesture.start.x
    const deltaY = point.y - gesture.start.y
    selection = adjustRegion(gesture.original, gesture.zone, deltaX, deltaY, bounds)
    render()
  } else if (selection) {
    shadeCanvas.style.cursor = cursorFor(
      zoneAt(selection, point, GRAB_MARGIN_CSS_PIXELS * pixelsPerCssPixel())
    )
  }
  followWithLoupe(event)
})

shadeCanvas.addEventListener('pointerleave', () => {
  loupe.hidden = true
})

shadeCanvas.addEventListener('pointerup', () => {
  if (gesture.kind === 'idle') {
    return
  }
  const tooSmall =
    selection && (selection.width < MIN_SELECTION_PIXELS || selection.height < MIN_SELECTION_PIXELS)
  if (tooSmall) {
    selection = null
  }
  gesture = { kind: 'idle' }
  render()
})

shadeCanvas.addEventListener('dblclick', (event) => {
  if (selection && zoneAt(selection, framePoint(event), 0) === 'move') {
    copyRegion()
  }
})

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  close()
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    close()
  } else if (event.key === 'Enter' || (event.ctrlKey && event.key.toLowerCase() === 'c')) {
    event.preventDefault()
    copyRegion()
  } else if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.altKey) {
    readRegionText()
  } else if (selection && gesture.kind === 'idle') {
    const step = event.ctrlKey ? FAST_NUDGE_PIXELS : 1
    const nudged = nudgeRegion(selection, event.key, step, event.shiftKey, bounds)
    if (nudged) {
      event.preventDefault()
      selection = nudged
      render()
    }
  }
})

actionBar.addEventListener('click', (event) => {
  const action =
    event.target instanceof Element ? event.target.closest('button')?.dataset['action'] : undefined
  if (action === 'copy') {
    copyRegion()
  } else if (action === 'text') {
    readRegionText()
  } else if (action === 'dismiss') {
    close()
  }
})

window.addEventListener('resize', render)
sizeLoupe()
window.overlay.onFrame(showFrame)
