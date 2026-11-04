import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { isTextKey, messagesFor } from './messages'

describe('messagesFor', () => {
  it('speaks French to French systems and English to everyone else', () => {
    expect(messagesFor('fr')).toBe(fr)
    expect(messagesFor('fr-CA')).toBe(fr)
    expect(messagesFor('en-US')).toBe(en)
    expect(messagesFor('de-DE')).toBe(en)
  })
})

describe('isTextKey', () => {
  it('accepts plain texts and refuses formatters or unknown keys', () => {
    expect(isTextKey(en, 'copy')).toBe(true)
    expect(isTextKey(en, 'captureCount')).toBe(false)
    expect(isTextKey(en, 'nothing')).toBe(false)
  })
})

describe('plurals', () => {
  it('counts blurred personal details in both languages', () => {
    expect([0, 1, 3].map(en.personalInfoBlurred)).toEqual([
      'No personal details spotted',
      'Blurred 1 personal detail',
      'Blurred 3 personal details'
    ])
    expect([0, 1, 3].map(fr.personalInfoBlurred)).toEqual([
      'Aucune info perso repérée',
      '1 info perso floutée',
      '3 infos perso floutées'
    ])
  })
})
