import { spawn } from 'node:child_process'
import { nativeImage } from 'electron'
import { copyTextToClipboard } from './waylandClipboard'
import {
  isCommandNotFound,
  MissingToolError,
  missingToolError,
  OCR_LANGUAGES,
  ocrLanguagePackage
} from './systemTools'

const MISSING_LANGUAGE = /Failed loading language '([^']+)'/g
const MAX_UPSCALE = 3
const MAX_READING_PIXELS = 12_000_000

export function readingScaleFor(width: number, height: number): number {
  const affordable = Math.floor(Math.sqrt(MAX_READING_PIXELS / Math.max(1, width * height)))
  return Math.max(1, Math.min(MAX_UPSCALE, affordable))
}

function enlargedForReading(png: Buffer): Buffer {
  const image = nativeImage.createFromBuffer(png)
  const { width, height } = image.getSize()
  const scale = readingScaleFor(width, height)
  return scale === 1
    ? png
    : image.resize({ width: width * scale, height: height * scale, quality: 'best' }).toPNG()
}

function tidyRecognizedText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function tesseractFailure(stderr: string, exitCode: number | null): Error {
  const missingPackages = [...stderr.matchAll(MISSING_LANGUAGE)]
    .map((match) => match[1])
    .filter((language) => language !== undefined)
    .map(ocrLanguagePackage)
  if (missingPackages.length > 0) {
    return new MissingToolError(`Il manque des langues à Tesseract, installe ${missingPackages.join(' et ')}`)
  }
  return new Error(stderr.trim() || `tesseract a quitté avec le code ${exitCode}`)
}

function runTesseract(png: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tesseract = spawn('tesseract', ['stdin', 'stdout', '-l', OCR_LANGUAGES.join('+')], {
      env: { ...process.env, OMP_THREAD_LIMIT: '1' }
    })
    const output: Buffer[] = []
    const errors: Buffer[] = []
    tesseract.stdout.on('data', (chunk: Buffer) => output.push(chunk))
    tesseract.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
    tesseract.on('error', (error) => reject(isCommandNotFound(error) ? missingToolError('tesseract') : error))
    tesseract.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(tidyRecognizedText(Buffer.concat(output).toString()))
      } else {
        reject(tesseractFailure(Buffer.concat(errors).toString(), exitCode))
      }
    })
    tesseract.stdin.end(png)
  })
}

export function recognizeText(png: Buffer): Promise<string> {
  return runTesseract(enlargedForReading(png))
}

export async function copyTextFromImage(png: Buffer): Promise<string> {
  const text = await recognizeText(png)
  if (text) {
    await copyTextToClipboard(text)
  }
  return text
}
