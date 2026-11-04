import { spawn } from 'node:child_process'
import { nativeImage } from 'electron'
import type { Region } from '../shared/types'
import { copyTextToClipboard } from './waylandClipboard'
import {
  isCommandNotFound,
  MissingToolError,
  missingToolError,
  OCR_LANGUAGES,
  ocrLanguagePackage
} from './systemTools'

const MISSING_LANGUAGE = /Failed loading language '([^']+)'/g
const TSV_WORD_LEVEL = '5'
const TSV_COLUMNS = 12

export interface RecognizedWord {
  text: string
  line: string
  box: Region
}

interface EnlargedImage {
  png: Buffer
  scale: number
}
const MAX_UPSCALE = 3
const MAX_READING_PIXELS = 12_000_000

export function readingScaleFor(width: number, height: number): number {
  const affordable = Math.floor(Math.sqrt(MAX_READING_PIXELS / Math.max(1, width * height)))
  return Math.max(1, Math.min(MAX_UPSCALE, affordable))
}

function enlargedForReading(png: Buffer): EnlargedImage {
  const image = nativeImage.createFromBuffer(png)
  const { width, height } = image.getSize()
  const scale = readingScaleFor(width, height)
  if (scale === 1) {
    return { png, scale }
  }
  return {
    png: image.resize({ width: width * scale, height: height * scale, quality: 'best' }).toPNG(),
    scale
  }
}

export function wordsFromTsv(tsv: string, scale: number): RecognizedWord[] {
  return tsv
    .split('\n')
    .slice(1)
    .flatMap((row) => {
      const cells = row.split('\t')
      const text = cells[TSV_COLUMNS - 1]?.trim() ?? ''
      if (cells.length < TSV_COLUMNS || cells[0] !== TSV_WORD_LEVEL || !text) {
        return []
      }
      const [left = NaN, top = NaN, width = NaN, height = NaN] = cells.slice(6, 10).map(Number)
      if (![left, top, width, height].every(Number.isFinite)) {
        return []
      }
      const box = {
        x: Math.floor(left / scale),
        y: Math.floor(top / scale),
        width: Math.ceil(width / scale),
        height: Math.ceil(height / scale)
      }
      return [{ text, line: cells.slice(1, 5).join('.'), box }]
    })
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

function runTesseract(png: Buffer, outputFormats: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const tesseract = spawn(
      'tesseract',
      ['stdin', 'stdout', '-l', OCR_LANGUAGES.join('+'), ...outputFormats],
      {
        env: { ...process.env, OMP_THREAD_LIMIT: '1' }
      }
    )
    const output: Buffer[] = []
    const errors: Buffer[] = []
    tesseract.stdout.on('data', (chunk: Buffer) => output.push(chunk))
    tesseract.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
    tesseract.on('error', (error) => reject(isCommandNotFound(error) ? missingToolError('tesseract') : error))
    tesseract.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(Buffer.concat(output).toString())
      } else {
        reject(tesseractFailure(Buffer.concat(errors).toString(), exitCode))
      }
    })
    tesseract.stdin.end(png)
  })
}

export async function recognizeText(png: Buffer): Promise<string> {
  return tidyRecognizedText(await runTesseract(enlargedForReading(png).png))
}

export async function recognizeWords(png: Buffer): Promise<RecognizedWord[]> {
  const enlarged = enlargedForReading(png)
  return wordsFromTsv(await runTesseract(enlarged.png, ['tsv']), enlarged.scale)
}

export async function copyTextFromImage(png: Buffer): Promise<string> {
  const text = await recognizeText(png)
  if (text) {
    await copyTextToClipboard(text)
  }
  return text
}
