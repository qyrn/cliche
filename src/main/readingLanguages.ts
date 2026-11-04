import { execFile } from 'node:child_process'
import { app } from 'electron'
import { installedLanguagesIn, usableReadingLanguages, wantedReadingLanguages } from './ocrLanguages'

let languages: Promise<string[]> | null = null

function listInstalledLanguages(): Promise<Set<string>> {
  return new Promise((resolve) => {
    execFile('tesseract', ['--list-langs'], (error, stdout, stderr) => {
      resolve(error ? new Set() : installedLanguagesIn(`${stdout}\n${stderr}`))
    })
  })
}

export function systemReadingLanguages(): string[] {
  return wantedReadingLanguages(app.getPreferredSystemLanguages())
}

export function readingLanguages(): Promise<string[]> {
  languages ??= listInstalledLanguages().then((installed) =>
    usableReadingLanguages(systemReadingLanguages(), installed)
  )
  return languages
}
