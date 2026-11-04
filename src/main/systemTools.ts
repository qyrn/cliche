import type { Messages } from '../shared/i18n/messages'

export const TOOL_PACKAGES = {
  'wl-copy': 'wl-clipboard',
  gdbus: 'glib2',
  tesseract: 'tesseract'
} as const

export type ExternalTool = keyof typeof TOOL_PACKAGES

export function ocrLanguagePackage(language: string): string {
  return `tesseract-data-${language}`
}

export function isCommandNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

export class MissingToolError extends Error {}

export function missingToolError(tool: ExternalTool, messages: Messages): MissingToolError {
  return new MissingToolError(messages.missingTool(tool, TOOL_PACKAGES[tool]))
}
