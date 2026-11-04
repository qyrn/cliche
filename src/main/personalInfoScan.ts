import type { Region } from '../shared/types'
import { imageOfRegion, toRegionWithin } from './frameRegion'
import { personalInfoAreas } from './personalInfo'
import type { CapturedFrame } from './screenGrab'
import { recognizeWords } from './textRecognition'

export async function scanFrameForPersonalInfo(frame: CapturedFrame, payload: unknown): Promise<Region[]> {
  const zone = toRegionWithin(payload, frame)
  const words = await recognizeWords(imageOfRegion(frame, zone).toPNG())
  return personalInfoAreas(words, zone)
}
