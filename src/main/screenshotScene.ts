import { join } from 'node:path'
import { app, type NativeImage, type Size } from 'electron'
import type { Region } from '../shared/types'
import { toRegionWithin } from './frameRegion'
import { createOffscreenWindow, waitForPage } from './offscreenPage'
import type { CapturedFrame } from './screenGrab'

export const SCENE_SIZE: Size = { width: 1440, height: 900 }

export interface Scene {
  frame: CapturedFrame
  heroRegion: Region
  loupeTarget: Region
  sampleRegions: Region[]
}

const SCENE_READY = 'document.fonts.ready.then(() => [...document.images].every((image) => image.complete))'

const MEASURE_TARGETS = `(() => {
  const regionOf = (element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }
  const hero = document.querySelector('[data-hero]')
  const loupe = document.querySelector('[data-loupe]')
  const samples = [...document.querySelectorAll('[data-capture]')]
    .sort((first, second) => Number(first.dataset.capture) - Number(second.dataset.capture))
    .map(regionOf)
  return { hero: hero ? regionOf(hero) : null, loupe: loupe ? regionOf(loupe) : null, samples }
})()`

function swapRedAndBlue(bitmap: Buffer): Buffer {
  for (let offset = 0; offset < bitmap.length; offset += 4) {
    const blue = bitmap.readUInt8(offset)
    bitmap.writeUInt8(bitmap.readUInt8(offset + 2), offset)
    bitmap.writeUInt8(blue, offset + 2)
  }
  return bitmap
}

function frameOf(image: NativeImage): CapturedFrame {
  const { width, height } = image.getSize()
  if (width !== SCENE_SIZE.width || height !== SCENE_SIZE.height) {
    throw new Error(
      `La scène a été rendue en ${width} × ${height} au lieu de ${SCENE_SIZE.width} × ${SCENE_SIZE.height}`
    )
  }
  return { width, height, pixels: swapRedAndBlue(image.toBitmap()) }
}

function targetsWithin(measured: unknown, frame: CapturedFrame): Omit<Scene, 'frame'> {
  if (
    typeof measured !== 'object' ||
    measured === null ||
    !('hero' in measured) ||
    !('loupe' in measured) ||
    !('samples' in measured) ||
    !Array.isArray(measured.samples)
  ) {
    throw new Error('Scène illisible : il manque data-hero, data-loupe ou data-capture')
  }
  return {
    heroRegion: toRegionWithin(measured.hero, frame),
    loupeTarget: toRegionWithin(measured.loupe, frame),
    sampleRegions: measured.samples.map((region: unknown) => toRegionWithin(region, frame))
  }
}

export async function renderScene(): Promise<Scene> {
  const window = createOffscreenWindow(SCENE_SIZE, { sandbox: true, contextIsolation: true })
  await window.loadFile(join(app.getAppPath(), 'docs', 'scene', 'index.html'))
  await waitForPage(window, SCENE_READY)
  const measured: unknown = await window.webContents.executeJavaScript(MEASURE_TARGETS)
  const frame = frameOf(await window.webContents.capturePage())
  return { frame, ...targetsWithin(measured, frame) }
}
