import type { CaptureEntry } from '../../shared/types'
import { requireElement } from '../requireElement'
import { dayKey, dayLabel, timeLabel } from './captureDates'

const COPIED_MARK_DURATION_MS = 1600
const TEXT_PREVIEW_LENGTH = 90

const sheet = requireElement('#sheet', HTMLElement)
const emptyMessage = requireElement('#empty', HTMLParagraphElement)
const countLabel = requireElement('#count', HTMLParagraphElement)
const statusLine = requireElement('#status', HTMLParagraphElement)
const openFolderButton = requireElement('#open-folder', HTMLButtonElement)
const frameTemplate = requireElement('#frame-template', HTMLTemplateElement)

let captureCount = 0

function setStatus(message: string): void {
  statusLine.textContent = message
}

function failureMessage(prefix: string, error: unknown): string {
  const detail =
    error instanceof Error
      ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
      : ''
  return detail ? `${prefix} : ${detail}` : prefix
}

function updateCount(): void {
  countLabel.textContent = captureCount === 1 ? '1 capture' : `${captureCount} captures`
  emptyMessage.hidden = captureCount > 0
}

function captureUrl(name: string): string {
  return `capture://shot/${encodeURIComponent(name)}`
}

function buildFrame(entry: CaptureEntry): HTMLLIElement {
  const frame = requireElement(
    '.frame',
    HTMLLIElement,
    frameTemplate.content.cloneNode(true) as DocumentFragment
  )
  const time = timeLabel(entry.takenAt)
  frame.dataset['name'] = entry.name
  requireElement('img', HTMLImageElement, frame).src = captureUrl(entry.name)
  requireElement('.shot', HTMLButtonElement, frame).setAttribute('aria-label', `Copier la capture de ${time}`)
  const timeElement = requireElement('time', HTMLTimeElement, frame)
  timeElement.textContent = time
  timeElement.dateTime = new Date(entry.takenAt).toISOString()
  return frame
}

function buildDay(label: string, entries: CaptureEntry[]): HTMLElement {
  const section = document.createElement('section')
  section.className = 'day'
  const heading = document.createElement('h2')
  heading.textContent = label
  const list = document.createElement('ol')
  list.className = 'frames'
  list.append(...entries.map(buildFrame))
  section.append(heading, list)
  return section
}

function groupByDay(entries: CaptureEntry[]): CaptureEntry[][] {
  const groups = new Map<number, CaptureEntry[]>()
  for (const entry of entries) {
    const key = dayKey(entry.takenAt)
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.values()]
}

async function refresh(): Promise<void> {
  const entries = await window.captures.list()
  const days = groupByDay(entries).map((group) => buildDay(dayLabel(group[0]?.takenAt ?? 0), group))
  sheet.replaceChildren(emptyMessage, ...days)
  captureCount = entries.length
  updateCount()
}

function markCopied(frame: HTMLLIElement): void {
  frame.classList.add('copied')
  window.setTimeout(() => frame.classList.remove('copied'), COPIED_MARK_DURATION_MS)
}

function removeFrame(frame: HTMLLIElement): void {
  const day = frame.closest('.day')
  frame.remove()
  if (day && !day.querySelector('.frame')) {
    day.remove()
  }
  captureCount -= 1
  updateCount()
}

function previewOf(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ')
  return singleLine.length > TEXT_PREVIEW_LENGTH ? `${singleLine.slice(0, TEXT_PREVIEW_LENGTH)}…` : singleLine
}

async function copyImage(frame: HTMLLIElement, name: string): Promise<void> {
  try {
    await window.captures.copyImage(name)
    markCopied(frame)
    setStatus('Image copiée')
  } catch (error) {
    setStatus(failureMessage('Impossible de copier cette image', error))
  }
}

async function copyText(name: string): Promise<void> {
  setStatus('Lecture du texte…')
  try {
    const text = await window.captures.readText(name)
    setStatus(text ? `Texte copié : « ${previewOf(text)} »` : 'Aucun texte trouvé dans cette capture')
  } catch (error) {
    setStatus(failureMessage('La lecture du texte a échoué', error))
  }
}

async function openCapture(name: string): Promise<void> {
  try {
    await window.captures.open(name)
  } catch (error) {
    setStatus(failureMessage("Impossible d'ouvrir cette capture", error))
  }
}

async function trashCapture(frame: HTMLLIElement, name: string): Promise<void> {
  try {
    await window.captures.trash(name)
    removeFrame(frame)
    setStatus('Capture mise à la corbeille')
  } catch (error) {
    setStatus(failureMessage('Impossible de supprimer cette capture', error))
  }
}

function frameFrom(target: EventTarget | null): { frame: HTMLLIElement; name: string } | null {
  const frame = target instanceof Element ? target.closest('.frame') : null
  const name = frame instanceof HTMLLIElement ? frame.dataset['name'] : undefined
  return frame instanceof HTMLLIElement && name ? { frame, name } : null
}

sheet.addEventListener('click', (event) => {
  const target = frameFrom(event.target)
  const button = event.target instanceof Element ? event.target.closest('button') : null
  if (!target || !button) {
    return
  }
  const tool = button.dataset['tool']
  if (tool === 'text') {
    void copyText(target.name)
  } else if (tool === 'open') {
    void openCapture(target.name)
  } else if (tool === 'trash') {
    void trashCapture(target.frame, target.name)
  } else if (button.classList.contains('shot')) {
    void copyImage(target.frame, target.name)
  }
})

sheet.addEventListener('dblclick', (event) => {
  const target = frameFrom(event.target)
  if (target && event.target instanceof Element && event.target.closest('.shot')) {
    void openCapture(target.name)
  }
})

sheet.addEventListener('keydown', (event) => {
  const target = frameFrom(event.target)
  if (!target || event.ctrlKey || event.altKey) {
    return
  }
  if (event.key === 'Delete') {
    void trashCapture(target.frame, target.name)
  } else if (event.key.toLowerCase() === 't') {
    void copyText(target.name)
  }
})

sheet.addEventListener('dragstart', (event) => {
  const target = frameFrom(event.target)
  if (target) {
    event.preventDefault()
    window.captures.startDrag(target.name)
  }
})

openFolderButton.addEventListener('click', () => {
  window.captures
    .openFolder()
    .catch((error: unknown) => setStatus(failureMessage("Impossible d'ouvrir le dossier", error)))
})

window.captures.onChanged(() => void refresh())
window.addEventListener('focus', () => void refresh())
void refresh()
