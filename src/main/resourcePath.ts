import { join } from 'node:path'
import { app } from 'electron'

export function resourcePath(...segments: string[]): string {
  const root = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(root, ...segments)
}
