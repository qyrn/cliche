const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function dayKey(timestamp: number): number {
  return startOfDay(new Date(timestamp))
}

export function dayLabel(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp)
  const today = startOfDay(now)
  const day = startOfDay(date)
  if (day === today) {
    return "Aujourd'hui"
  }
  if (day === startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) {
    return 'Hier'
  }
  const formatter = date.getFullYear() === now.getFullYear() ? weekdayFormatter : fullDateFormatter
  return capitalize(formatter.format(date))
}

export function timeLabel(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp))
}
