import { execFile } from 'node:child_process'
import type { Region } from '../shared/types'
import { resourcePath } from './resourcePath'

const HELPER_TIMEOUT_MS = 3000

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Size {
  width: number
  height: number
}

function isRect(value: unknown): value is Rect {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate: Partial<Record<keyof Rect, unknown>> = value
  return [candidate.x, candidate.y, candidate.width, candidate.height].every(
    (field) => typeof field === 'number' && Number.isFinite(field)
  )
}

function clippedToFrame(window: Rect, screen: Rect, scale: number, frame: Size): Region {
  const left = Math.max(0, Math.round((window.x - screen.x) * scale))
  const top = Math.max(0, Math.round((window.y - screen.y) * scale))
  const right = Math.min(frame.width, Math.round((window.x + window.width - screen.x) * scale))
  const bottom = Math.min(frame.height, Math.round((window.y + window.height - screen.y) * scale))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function windowRegionsIn(layout: unknown, frame: Size): Region[] {
  if (
    typeof layout !== 'object' ||
    layout === null ||
    !('screen' in layout) ||
    !('windows' in layout) ||
    !isRect(layout.screen) ||
    layout.screen.width <= 0 ||
    !Array.isArray(layout.windows)
  ) {
    return []
  }
  const screen = layout.screen
  const scale = frame.width / screen.width
  return layout.windows
    .filter(isRect)
    .map((window) => clippedToFrame(window, screen, scale, frame))
    .filter((region) => region.width > 0 && region.height > 0)
    .reverse()
}

export function grabWindowLayout(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execFile(resourcePath('bin', 'kwin-windows'), { timeout: HELPER_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (parseError) {
        reject(parseError)
      }
    })
  })
}
