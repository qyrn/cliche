import { spawn } from 'node:child_process'
import { copyTextToClipboard } from './waylandClipboard'
import { isCommandNotFound, missingToolError, OCR_LANGUAGES, ocrLanguagePackage } from './systemTools'

const MISSING_LANGUAGE = /Failed loading language '([^']+)'/g

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
    return new Error(`Il manque des langues à Tesseract, installe ${missingPackages.join(' et ')}`)
  }
  return new Error(stderr.trim() || `tesseract a quitté avec le code ${exitCode}`)
}

function recognizeText(png: Buffer): Promise<string> {
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

export async function copyTextFromImage(png: Buffer): Promise<string> {
  const text = await recognizeText(png)
  if (text) {
    await copyTextToClipboard(text)
  }
  return text
}
