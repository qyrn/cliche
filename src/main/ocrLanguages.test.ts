import { describe, expect, it } from 'vitest'
import {
  installedLanguagesIn,
  tesseractLanguageFor,
  usableReadingLanguages,
  wantedReadingLanguages
} from './ocrLanguages'

describe('tesseractLanguageFor', () => {
  it.each([
    ['fr-FR', 'fra'],
    ['de_DE.UTF-8', 'deu'],
    ['pt-BR', 'por'],
    ['nb', 'nor'],
    ['zh-CN', 'chi_sim'],
    ['zh-TW', 'chi_tra'],
    ['zh-Hant-HK', 'chi_tra']
  ])('maps %s to %s', (locale, language) => {
    expect(tesseractLanguageFor(locale)).toBe(language)
  })

  it('knows nothing about a made up language', () => {
    expect(tesseractLanguageFor('xx-YY')).toBeNull()
  })
})

describe('wantedReadingLanguages', () => {
  it('reads the system languages first, then English, without duplicates', () => {
    expect(wantedReadingLanguages(['fr-FR', 'fr-FR', 'fr', 'fr'])).toEqual(['fra', 'eng'])
    expect(wantedReadingLanguages(['ja-JP', 'en-US'])).toEqual(['jpn', 'eng'])
  })
})

describe('usableReadingLanguages', () => {
  const installed = installedLanguagesIn(
    'List of available languages in "/usr/share/tessdata/" (2):\neng\nosd\n'
  )

  it('keeps only the languages Tesseract has', () => {
    expect(usableReadingLanguages(['deu', 'eng'], installed)).toEqual(['eng'])
  })

  it('falls back to English when nothing matches', () => {
    expect(usableReadingLanguages(['deu'], new Set())).toEqual(['eng'])
  })
})
