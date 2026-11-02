import { spawn } from 'node:child_process'
import { copyTextToClipboard } from './waylandClipboard'

const TESSERACT_LANGUAGES = 'fra+eng'

function tidyRecognizedText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function recognizeText(png: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tesseract = spawn('tesseract', ['stdin', 'stdout', '-l', TESSERACT_LANGUAGES], {
      env: { ...process.env, OMP_THREAD_LIMIT: '1' }
    })
    const output: Buffer[] = []
    const errors: Buffer[] = []
    tesseract.stdout.on('data', (chunk: Buffer) => output.push(chunk))
    tesseract.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
    tesseract.on('error', reject)
    tesseract.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(tidyRecognizedText(Buffer.concat(output).toString()))
      } else {
        reject(
          new Error(Buffer.concat(errors).toString().trim() || `tesseract a quitté avec le code ${exitCode}`)
        )
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
