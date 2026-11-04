import type { Messages } from '../../shared/i18n/messages'

export interface DateLabels {
  dayLabel(timestamp: number, now?: Date): string
  timeLabel(timestamp: number): string
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function dayKey(timestamp: number): number {
  return startOfDay(new Date(timestamp))
}

export function dateLabels(messages: Messages): DateLabels {
  const weekdayFormatter = new Intl.DateTimeFormat(messages.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const fullDateFormatter = new Intl.DateTimeFormat(messages.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const timeFormatter = new Intl.DateTimeFormat(messages.locale, { hour: '2-digit', minute: '2-digit' })
  return {
    dayLabel(timestamp, now = new Date()) {
      const date = new Date(timestamp)
      const day = startOfDay(date)
      if (day === startOfDay(now)) {
        return messages.today
      }
      if (day === startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) {
        return messages.yesterday
      }
      const formatter = date.getFullYear() === now.getFullYear() ? weekdayFormatter : fullDateFormatter
      return capitalize(formatter.format(date))
    },
    timeLabel: (timestamp) => timeFormatter.format(new Date(timestamp))
  }
}
