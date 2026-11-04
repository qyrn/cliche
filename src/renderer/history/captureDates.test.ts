import { describe, expect, it } from 'vitest'
import { dayKey, dayLabel, timeLabel } from './captureDates'

const now = new Date(2026, 10, 4, 15, 0)

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(dayLabel(new Date(2026, 10, 4, 0, 5).getTime(), now)).toBe("Aujourd'hui")
    expect(dayLabel(new Date(2026, 10, 3, 23, 59).getTime(), now)).toBe('Hier')
  })

  it('spells out older days, with the year only when it changes', () => {
    expect(dayLabel(new Date(2026, 10, 1, 12, 0).getTime(), now)).toBe('Dimanche 1 novembre')
    expect(dayLabel(new Date(2025, 11, 31, 12, 0).getTime(), now)).toBe('31 décembre 2025')
  })
})

describe('dayKey', () => {
  it('groups two captures of the same day together', () => {
    expect(dayKey(new Date(2026, 10, 4, 8, 0).getTime())).toBe(dayKey(new Date(2026, 10, 4, 22, 0).getTime()))
  })
})

describe('timeLabel', () => {
  it('shows hours and minutes', () => {
    expect(timeLabel(new Date(2026, 10, 4, 9, 5).getTime())).toBe('09:05')
  })
})
