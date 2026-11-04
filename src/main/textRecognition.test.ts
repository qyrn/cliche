import { describe, expect, it, vi } from 'vitest'
import { readingScaleFor, wordsFromTsv } from './textRecognition'

vi.mock('electron', () => ({ nativeImage: {} }))

describe('readingScaleFor', () => {
  it('triples small zones so Tesseract sees bigger letters', () => {
    expect(readingScaleFor(240, 95)).toBe(3)
  })

  it('doubles a full HD screen and leaves a 4K screen alone', () => {
    expect(readingScaleFor(1920, 1080)).toBe(2)
    expect(readingScaleFor(3840, 2160)).toBe(1)
  })
})

describe('wordsFromTsv', () => {
  const tsv = [
    'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
    '4\t1\t1\t1\t1\t0\t30\t60\t600\t60\t-1\t',
    '5\t1\t1\t1\t1\t1\t30\t60\t270\t60\t95.1\tcamille@example.com',
    '5\t1\t1\t1\t1\t2\t330\t60\t3\t60\t95.0\t ',
    '5\t1\t2\t1\t1\t1\t31\t150\t91\t61\t91.3\t06'
  ].join('\n')

  it('keeps the words with their box brought back to the original size', () => {
    expect(wordsFromTsv(tsv, 3)).toEqual([
      { text: 'camille@example.com', line: '1.1.1.1', box: { x: 10, y: 20, width: 90, height: 20 } },
      { text: '06', line: '1.2.1.1', box: { x: 10, y: 50, width: 31, height: 21 } }
    ])
  })
})
