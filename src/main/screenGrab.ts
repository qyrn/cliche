import { execFile } from 'node:child_process'
import type { ScreenFrame } from '../shared/types'
import { resourcePath } from './resourcePath'

const HELPER_OUTPUT_LIMIT_BYTES = 1024 * 1024 * 1024
const HEADER_END = 0x0a

export interface CapturedFrame extends ScreenFrame {
  pixels: Buffer
}

function parseHelperOutput(output: Buffer): CapturedFrame {
  const headerEnd = output.indexOf(HEADER_END)
  const [width = 0, height = 0] = output.subarray(0, headerEnd).toString().split(' ').map(Number)
  const pixels = output.subarray(headerEnd + 1)
  if (headerEnd < 0 || width <= 0 || height <= 0 || pixels.length !== width * height * 4) {
    throw new Error('Réponse illisible du helper de capture')
  }
  return { width, height, pixels }
}

export function grabActiveScreen(): Promise<CapturedFrame> {
  return new Promise((resolve, reject) => {
    execFile(
      resourcePath('bin', 'kwin-grab'),
      { encoding: 'buffer', maxBuffer: HELPER_OUTPUT_LIMIT_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.toString().trim() || error.message))
          return
        }
        try {
          resolve(parseHelperOutput(stdout))
        } catch (parseError) {
          reject(parseError)
        }
      }
    )
  })
}
