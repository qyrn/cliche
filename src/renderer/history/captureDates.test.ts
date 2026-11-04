import { describe, expect, it } from 'vitest'
import { en } from '../../shared/i18n/en'
import { fr } from '../../shared/i18n/fr'
import { dateLabels, dayKey } from './captureDates'

const now = new Date(2026, 10, 4, 15, 0)
const french = dateLabels(fr)
const english = dateLabels(en)

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(french.dayLabel(new Date(2026, 10, 4, 0, 5).getTime(), now)).toBe("Aujourd'hui")
    expect(french.dayLabel(new Date(2026, 10, 3, 23, 59).getTime(), now)).toBe('Hier')
    expect(english.dayLabel(new Date(2026, 10, 3, 23, 59).getTime(), now)).toBe('Yesterday')
  })

  it('spells out older days, with the year only when it changes', () => {
    expect(french.dayLabel(new Date(2026, 10, 1, 12, 0).getTime(), now)).toBe('Dimanche 1 novembre')
    expect(french.dayLabel(new Date(2025, 11, 31, 12, 0).getTime(), now)).toBe('31 décembre 2025')
    expect(english.dayLabel(new Date(2026, 10, 1, 12, 0).getTime(), now)).toBe('Sunday, November 1')
    expect(english.dayLabel(new Date(2025, 11, 31, 12, 0).getTime(), now)).toBe('December 31, 2025')
  })
})

describe('dayKey', () => {
  it('groups two captures of the same day together', () => {
    expect(dayKey(new Date(2026, 10, 4, 8, 0).getTime())).toBe(dayKey(new Date(2026, 10, 4, 22, 0).getTime()))
  })
})

describe('timeLabel', () => {
  it('shows hours and minutes the way each language writes them', () => {
    expect(french.timeLabel(new Date(2026, 10, 4, 9, 5).getTime())).toBe('09:05')
    expect(english.timeLabel(new Date(2026, 10, 4, 14, 32).getTime())).toBe('02:32 PM')
  })
})
