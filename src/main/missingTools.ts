import { execFile } from 'node:child_process'
import { installedLanguagesIn } from './ocrLanguages'
import { isCommandNotFound, ocrLanguagePackage, TOOL_PACKAGES, type ExternalTool } from './systemTools'

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

export async function findMissingPackages(readingLanguages: readonly string[]): Promise<string[]> {
  const tools = Object.keys(TOOL_PACKAGES) as ExternalTool[]
  const outputs = await Promise.all(tools.map(probe))
  const missing: string[] = tools
    .filter((_tool, index) => outputs[index] === null)
    .map((tool) => TOOL_PACKAGES[tool])
  const tesseractListing = outputs[tools.indexOf('tesseract')]
  if (tesseractListing) {
    const installed = installedLanguagesIn(tesseractListing)
    missing.push(...readingLanguages.filter((language) => !installed.has(language)).map(ocrLanguagePackage))
  }
  return missing
}
