import { spawn } from 'node:child_process'

function wlCopy(data: Buffer | string, mimeType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('wl-copy', ['--type', mimeType], { stdio: ['pipe', 'ignore', 'ignore'] })
    child.on('error', reject)
    child.on('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve()
      } else {
        reject(new Error(`wl-copy a quitté avec le code ${exitCode}`))
      }
    })
    child.stdin.end(data)
  })
}

export function copyPngToClipboard(png: Buffer): Promise<void> {
  return wlCopy(png, 'image/png')
}

export function copyTextToClipboard(text: string): Promise<void> {
  return wlCopy(text, 'text/plain;charset=utf-8')
}
