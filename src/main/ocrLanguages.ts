const FALLBACK_LANGUAGE = 'eng'

const TESSERACT_LANGUAGES: Partial<Record<string, string>> = {
  af: 'afr',
  ar: 'ara',
  be: 'bel',
  bg: 'bul',
  bn: 'ben',
  bs: 'bos',
  ca: 'cat',
  cs: 'ces',
  cy: 'cym',
  da: 'dan',
  de: 'deu',
  el: 'ell',
  en: 'eng',
  eo: 'epo',
  es: 'spa',
  et: 'est',
  eu: 'eus',
  fa: 'fas',
  fi: 'fin',
  fr: 'fra',
  ga: 'gle',
  gl: 'glg',
  he: 'heb',
  hi: 'hin',
  hr: 'hrv',
  hu: 'hun',
  id: 'ind',
  is: 'isl',
  it: 'ita',
  ja: 'jpn',
  ka: 'kat',
  kk: 'kaz',
  km: 'khm',
  ko: 'kor',
  lt: 'lit',
  lv: 'lav',
  mk: 'mkd',
  ms: 'msa',
  mt: 'mlt',
  nb: 'nor',
  nl: 'nld',
  nn: 'nor',
  no: 'nor',
  pl: 'pol',
  pt: 'por',
  ro: 'ron',
  ru: 'rus',
  sk: 'slk',
  sl: 'slv',
  sq: 'sqi',
  sr: 'srp',
  sv: 'swe',
  sw: 'swa',
  ta: 'tam',
  te: 'tel',
  th: 'tha',
  tl: 'tgl',
  tr: 'tur',
  uk: 'ukr',
  ur: 'urd',
  uz: 'uzb',
  vi: 'vie'
}

const TRADITIONAL_CHINESE_REGIONS = new Set(['tw', 'hk', 'mo', 'hant'])

export function tesseractLanguageFor(locale: string): string | null {
  const [language = '', ...rest] = locale.toLowerCase().split(/[-_.]/)
  if (language === 'zh') {
    return rest.some((part) => TRADITIONAL_CHINESE_REGIONS.has(part)) ? 'chi_tra' : 'chi_sim'
  }
  return TESSERACT_LANGUAGES[language] ?? null
}

export function wantedReadingLanguages(systemLocales: readonly string[]): string[] {
  const fromSystem = systemLocales.flatMap((locale) => tesseractLanguageFor(locale) ?? [])
  return [...new Set([...fromSystem, FALLBACK_LANGUAGE])]
}

export function usableReadingLanguages(wanted: readonly string[], installed: ReadonlySet<string>): string[] {
  const usable = wanted.filter((language) => installed.has(language))
  return usable.length > 0 ? usable : [FALLBACK_LANGUAGE]
}

export function installedLanguagesIn(listing: string): Set<string> {
  return new Set(listing.split('\n').map((line) => line.trim()))
}
