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
  hoverTarget: Region
  blurZone: Region
  sampleRegions: Region[]
}

type ScenePixels = Omit<CapturedFrame, 'windows'>
type SceneTargets = Omit<Scene, 'frame'> & { windows: Region[] }

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
  const hover = document.querySelector('[data-hover]')
  const blurZone = document.querySelector('[data-blur-zone]')
  const windows = [...document.querySelectorAll('[data-window]')].map(regionOf)
  const samples = [...document.querySelectorAll('[data-capture]')]
    .sort((first, second) => Number(first.dataset.capture) - Number(second.dataset.capture))
    .map(regionOf)
  return {
    hero: hero ? regionOf(hero) : null,
    loupe: loupe ? regionOf(loupe) : null,
    hover: hover ? regionOf(hover) : null,
    blurZone: blurZone ? regionOf(blurZone) : null,
    windows,
    samples
  }
})()`

function swapRedAndBlue(bitmap: Buffer): Buffer {
  for (let offset = 0; offset < bitmap.length; offset += 4) {
    const blue = bitmap.readUInt8(offset)
    bitmap.writeUInt8(bitmap.readUInt8(offset + 2), offset)
    bitmap.writeUInt8(blue, offset + 2)
  }
  return bitmap
}

function pixelsOf(image: NativeImage): ScenePixels {
  const { width, height } = image.getSize()
  if (width !== SCENE_SIZE.width || height !== SCENE_SIZE.height) {
    throw new Error(
      `La scène a été rendue en ${width} × ${height} au lieu de ${SCENE_SIZE.width} × ${SCENE_SIZE.height}`
    )
  }
  return { width, height, pixels: swapRedAndBlue(image.toBitmap()) }
}

function targetsWithin(measured: unknown, frame: ScenePixels): SceneTargets {
  if (
    typeof measured !== 'object' ||
    measured === null ||
    !('hero' in measured) ||
    !('loupe' in measured) ||
    !('hover' in measured) ||
    !('blurZone' in measured) ||
    !('windows' in measured) ||
    !('samples' in measured) ||
    !Array.isArray(measured.windows) ||
    !Array.isArray(measured.samples)
  ) {
    throw new Error(
      'Scène illisible : il manque une cible data-hero, data-loupe, data-hover, data-blur-zone, data-window ou data-capture'
    )
  }
  return {
    heroRegion: toRegionWithin(measured.hero, frame),
    loupeTarget: toRegionWithin(measured.loupe, frame),
    hoverTarget: toRegionWithin(measured.hover, frame),
    blurZone: toRegionWithin(measured.blurZone, frame),
    windows: measured.windows.map((region: unknown) => toRegionWithin(region, frame)).reverse(),
    sampleRegions: measured.samples.map((region: unknown) => toRegionWithin(region, frame))
  }
}

export async function renderScene(): Promise<Scene> {
  const window = createOffscreenWindow(SCENE_SIZE, { sandbox: true, contextIsolation: true })
  await window.loadFile(join(app.getAppPath(), 'docs', 'scene', 'index.html'))
  await waitForPage(window, SCENE_READY)
  const measured: unknown = await window.webContents.executeJavaScript(MEASURE_TARGETS)
  const pixels = pixelsOf(await window.webContents.capturePage())
  const { windows, ...targets } = targetsWithin(measured, pixels)
  return { frame: { ...pixels, windows }, ...targets }
}
