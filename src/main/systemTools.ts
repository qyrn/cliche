export const OCR_LANGUAGES = ['fra', 'eng'] as const

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

export function missingToolError(tool: ExternalTool): MissingToolError {
  return new MissingToolError(`${tool} est introuvable, installe le paquet ${TOOL_PACKAGES[tool]}`)
}
