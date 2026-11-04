import { describe, expect, it } from 'vitest'
import { personalInfoAreas } from './personalInfo'
import type { RecognizedWord } from './textRecognition'

const zone = { x: 100, y: 200, width: 800, height: 400 }

function lineOf(text: string, line = '1.1.1.1', top = 10): RecognizedWord[] {
  let left = 0
  return text.split(' ').map((word) => {
    const box = { x: left, y: top, width: word.length * 10, height: 20 }
    left += word.length * 10 + 10
    return { text: word, line, box }
  })
}

function blurredWords(text: string): number {
  return personalInfoAreas(lineOf(text), zone).length
}

describe('personalInfoAreas', () => {
  it('covers an email address with a little margin, in screen coordinates', () => {
    expect(personalInfoAreas(lineOf('Écris à camille.martin@example.com demain'), zone)).toEqual([
      { x: 175, y: 205, width: 270, height: 30 }
    ])
  })

  it('covers a phone number spread over several words', () => {
    const [area] = personalInfoAreas(lineOf('Appelle le 06 39 98 12 34 ce soir'), zone)
    expect(area).toEqual({ x: 205, y: 205, width: 150, height: 30 })
  })

  it.each([
    ['an international phone', 'Tel +44 20 7946 0958'],
    ['an IBAN', 'IBAN FR76 3000 6000 0112 3456 7890 189'],
    ['a card number', 'Carte 4970 1012 3456 7890'],
    ['an OpenAI style key', 'export OPENAI_API_KEY=sk-proj-AbCdEf1234567890XyZ'],
    ['a GitHub token', 'token ghp_aBcDeF0123456789aBcDeF0123456789aBcD'],
    ['an AWS key', 'AKIAIOSFODNN7EXAMPLE'],
    ['a JSON web token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.dozjgNryP4J3jVmNHl0w5N'],
    ['a long mixed secret', 'secret=Zx8Qw3Er5Ty7Ui9Op1As2Df4Gh6Jk8Lm0Nb']
  ])('finds %s', (_label, text) => {
    expect(blurredWords(text)).toBeGreaterThan(0)
  })

  it.each([
    ['plain text', '250 g de farine et 4 œufs'],
    ['a time and a date', 'Capture du 2026-11-04 à 14:32'],
    ['a git commit hash', 'commit 3ec97ca07eb7083ee640f55d9331bb0c711efd71'],
    ['a price', 'Total 1 249,99 €']
  ])('leaves %s alone', (_label, text) => {
    expect(blurredWords(text)).toBe(0)
  })

  it('blurs an IBAN once even though its digits look like a card number', () => {
    expect(blurredWords('IBAN FR76 3000 6000 0112 3456 7890 189')).toBe(1)
  })

  it('keeps blurs inside the selected zone', () => {
    const word = [{ text: 'a@b.fr', line: '1', box: { x: -5, y: -5, width: 60, height: 20 } }]
    expect(personalInfoAreas(word, zone)).toEqual([{ x: 100, y: 200, width: 60, height: 20 }])
  })
})
