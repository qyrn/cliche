import type { Region } from '../shared/types'
import type { RecognizedWord } from './textRecognition'

const PERSONAL_INFO_PATTERNS = {
  email: /[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi,
  frenchPhone: /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g,
  internationalPhone: /\+\d{1,3}(?:[\s.-]?\d{2,4}){3,5}\b/g,
  iban: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g,
  cardNumber: /\b\d{4}(?:[\s-]?\d{4}){3}\b/g,
  knownApiKey:
    /\b(?:sk|pk|rk)-[\w-]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_\w{20,}|\bglpat-[\w-]{20,}|\bxox[abprs]-[\w-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[\w-]{30,}/g,
  jsonWebToken: /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g,
  mixedSecret: /\b(?=[\w-]*[a-z])(?=[\w-]*[A-Z])(?=[\w-]*\d)[\w-]{32,}/g
}

interface WordSpan {
  start: number
  end: number
  box: Region
}

function groupByLine(words: RecognizedWord[]): RecognizedWord[][] {
  const lines = new Map<string, RecognizedWord[]>()
  for (const word of words) {
    lines.set(word.line, [...(lines.get(word.line) ?? []), word])
  }
  return [...lines.values()]
}

function spansOf(line: RecognizedWord[]): { text: string; spans: WordSpan[] } {
  let text = ''
  const spans: WordSpan[] = []
  for (const word of line) {
    text += text ? ' ' : ''
    spans.push({ start: text.length, end: text.length + word.text.length, box: word.box })
    text += word.text
  }
  return { text, spans }
}

function unionOf(boxes: Region[]): Region {
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function paddedWithin(box: Region, zone: Region): Region | null {
  const padding = Math.max(2, Math.round(box.height * 0.25))
  const left = Math.max(zone.x, zone.x + box.x - padding)
  const top = Math.max(zone.y, zone.y + box.y - padding)
  const right = Math.min(zone.x + zone.width, zone.x + box.x + box.width + padding)
  const bottom = Math.min(zone.y + zone.height, zone.y + box.y + box.height + padding)
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null
}

function sensitiveBoxesIn(line: RecognizedWord[]): Region[] {
  const { text, spans } = spansOf(line)
  return Object.values(PERSONAL_INFO_PATTERNS).flatMap((pattern) =>
    [...text.matchAll(pattern)].flatMap((match) => {
      const start = match.index
      const end = start + match[0].length
      const covered = spans.filter((span) => span.start < end && span.end > start)
      return covered.length > 0 ? [unionOf(covered.map((span) => span.box))] : []
    })
  )
}

function contains(outer: Region, inner: Region): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

function isCoveredByAnother(area: Region, index: number, areas: Region[]): boolean {
  return areas.some((other, otherIndex) => {
    if (otherIndex === index || !contains(other, area)) {
      return false
    }
    const sameArea = contains(area, other)
    return !sameArea || otherIndex < index
  })
}

export function personalInfoAreas(words: RecognizedWord[], zone: Region): Region[] {
  const areas = groupByLine(words)
    .flatMap(sensitiveBoxesIn)
    .flatMap((box) => paddedWithin(box, zone) ?? [])
  return areas.filter((area, index, all) => !isCoveredByAnother(area, index, all))
}
