import { execFile } from 'node:child_process'
import {
  isCommandNotFound,
  OCR_LANGUAGES,
  ocrLanguagePackage,
  TOOL_PACKAGES,
  type ExternalTool
} from './systemTools'

const PROBE_ARGUMENTS: Record<ExternalTool, string[]> = {
  'wl-copy': ['--version'],
  gdbus: ['help'],
  tesseract: ['--list-langs']
}

function probe(tool: ExternalTool): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(tool, PROBE_ARGUMENTS[tool], (error, stdout, stderr) => {
      resolve(isCommandNotFound(error) ? null : `${stdout}\n${stderr}`)
    })
  })
}

function installedLanguages(listing: string): Set<string> {
  return new Set(listing.split('\n').map((line) => line.trim()))
}

export async function findMissingPackages(): Promise<string[]> {
  const tools = Object.keys(TOOL_PACKAGES) as ExternalTool[]
  const outputs = await Promise.all(tools.map(probe))
  const missing: string[] = tools
    .filter((_tool, index) => outputs[index] === null)
    .map((tool) => TOOL_PACKAGES[tool])
  const tesseractListing = outputs[tools.indexOf('tesseract')]
  if (tesseractListing) {
    const languages = installedLanguages(tesseractListing)
    missing.push(...OCR_LANGUAGES.filter((language) => !languages.has(language)).map(ocrLanguagePackage))
  }
  return missing
}
