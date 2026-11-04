import { messagesFor } from '../../shared/i18n/messages'
import type { CaptureEntry, KnownTexts } from '../../shared/types'
import { requireElement } from '../requireElement'
import { translatePage } from '../translatePage'
import { dateLabels, dayKey } from './captureDates'
import { containsAllWords, searchWords } from './textSearch'

const COPIED_MARK_DURATION_MS = 1600
const TEXT_PREVIEW_LENGTH = 90

const text = messagesFor(navigator.language)
const { dayLabel, timeLabel } = dateLabels(text)

const sheet = requireElement('#sheet', HTMLElement)
const emptyMessage = requireElement('#empty', HTMLParagraphElement)
const noMatchMessage = requireElement('#no-match', HTMLParagraphElement)
const countLabel = requireElement('#count', HTMLParagraphElement)
const searchInput = requireElement('#search', HTMLInputElement)
const statusLine = requireElement('#status', HTMLParagraphElement)
const openFolderButton = requireElement('#open-folder', HTMLButtonElement)
const frameTemplate = requireElement('#frame-template', HTMLTemplateElement)

let captureCount = 0
let matchCount = 0
let remainingToRead = 0
const readTexts = new Map<string, string>()

function setStatus(message: string): void {
  statusLine.textContent = message
}

function failureMessage(prefix: string, error: unknown): string {
  const detail =
    error instanceof Error
      ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
      : ''
  return detail ? text.withDetail(prefix, detail) : prefix
}

function updateCount(): void {
  const searching = searchWords(searchInput.value).length > 0
  const shown = searching ? text.matchCount(matchCount, captureCount) : text.captureCount(captureCount)
  countLabel.textContent = remainingToRead > 0 ? text.stillToRead(shown, remainingToRead) : shown
  emptyMessage.hidden = captureCount > 0
  noMatchMessage.hidden = !searching || matchCount > 0 || captureCount === 0
  const stillReading = remainingToRead > 0 ? text.noMatchStillReading(remainingToRead) : ''
  noMatchMessage.textContent = `${text.noMatch(searchInput.value.trim())}${stillReading}`
}

function applySearch(): void {
  const words = searchWords(searchInput.value)
  matchCount = 0
  for (const day of sheet.querySelectorAll<HTMLElement>('.day')) {
    let dayHasMatch = false
    for (const frame of day.querySelectorAll<HTMLLIElement>('.frame')) {
      const matches = containsAllWords(readTexts.get(frame.dataset['name'] ?? '') ?? '', words)
      frame.hidden = !matches
      if (matches) {
        matchCount += 1
        dayHasMatch = true
      }
    }
    day.hidden = !dayHasMatch
  }
  updateCount()
}

function mergeReadTexts(update: KnownTexts): void {
  for (const [name, text] of Object.entries(update.texts)) {
    readTexts.set(name, text)
  }
  remainingToRead = update.remaining
  applySearch()
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
  requireElement('.shot', HTMLButtonElement, frame).setAttribute('aria-label', text.copyCaptureOf(time))
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
  sheet.replaceChildren(emptyMessage, noMatchMessage, ...days)
  captureCount = entries.length
  applySearch()
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
  applySearch()
}

function previewOf(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ')
  return singleLine.length > TEXT_PREVIEW_LENGTH ? `${singleLine.slice(0, TEXT_PREVIEW_LENGTH)}…` : singleLine
}

async function copyImage(frame: HTMLLIElement, name: string): Promise<void> {
  try {
    await window.captures.copyImage(name)
    markCopied(frame)
    setStatus(text.imageCopied)
  } catch (error) {
    setStatus(failureMessage(text.cannotCopyImage, error))
  }
}

async function copyText(name: string): Promise<void> {
  setStatus(text.readingText)
  try {
    const captureText = await window.captures.readText(name)
    readTexts.set(name, captureText)
    setStatus(captureText ? text.textCopiedPreview(previewOf(captureText)) : text.noTextInCapture)
  } catch (error) {
    setStatus(failureMessage(text.textReadingFailed, error))
  }
}

async function openCapture(name: string): Promise<void> {
  try {
    await window.captures.open(name)
  } catch (error) {
    setStatus(failureMessage(text.cannotOpenCapture, error))
  }
}

async function trashCapture(frame: HTMLLIElement, name: string): Promise<void> {
  try {
    await window.captures.trash(name)
    removeFrame(frame)
    setStatus(text.movedToTrash)
  } catch (error) {
    setStatus(failureMessage(text.cannotTrash, error))
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
    .catch((error: unknown) => setStatus(failureMessage(text.cannotOpenFolder, error)))
})

translatePage(text)
searchInput.addEventListener('input', applySearch)

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && searchInput.value) {
    searchInput.value = ''
    applySearch()
  }
})

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    searchInput.focus()
    searchInput.select()
  }
})

window.captures.onChanged(() => void refresh())
window.captures.onTextsRead(mergeReadTexts)
window.addEventListener('focus', () => void refresh())
void refresh()
  .then(() => window.captures.texts())
  .then(mergeReadTexts)
