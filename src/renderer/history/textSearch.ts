const DIACRITICS = /\p{Diacritic}/gu

export function searchableText(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function searchWords(query: string): string[] {
  const normalized = searchableText(query)
  return normalized ? normalized.split(' ') : []
}

export function containsAllWords(text: string, words: string[]): boolean {
  const haystack = searchableText(text)
  return words.every((word) => haystack.includes(word))
}
