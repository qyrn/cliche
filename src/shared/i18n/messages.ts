import { en } from './en'
import { fr } from './fr'

export interface Messages {
  locale: string
  withDetail: (message: string, detail: string) => string

  trayCapture: string
  trayHistory: string
  trayOpenFolder: string
  trayLaunchAtLogin: string
  trayQuit: string
  shortcutName: string

  captureFailed: string
  overlayUnresponsive: string
  overlayCrashed: string
  captureCopied: string
  captureAlsoIn: (folder: string) => string
  textCopied: string
  noTextFound: string
  noTextFoundHint: string
  textReadingFailed: string
  somethingBroke: string
  printKeyTaken: string
  printKeyTakenHint: string
  missingTools: string
  installPackages: (packages: string[]) => string
  missingTool: (tool: string, packageName: string) => string
  missingReadingLanguages: (packages: string[]) => string
  unreadableHelperAnswer: string
  noCaptureInProgress: string

  overlayToolbarLabel: string
  copy: string
  copyText: string
  blur: string
  cancel: string
  keyEnter: string
  keyEscape: string
  aimHint: string
  wholeScreen: string
  cancelHint: string
  blurHint: string
  removeLastBlur: string
  finishBlur: string
  searchingPersonalInfo: string
  personalInfoBlurred: (count: number) => string
  personalInfoFailed: string

  searchPlaceholder: string
  searchLabel: string
  openFolder: string
  emptyHistory: string
  historyTip: string
  toolText: string
  toolOpen: string
  toolTrash: string
  copyCaptureOf: (time: string) => string
  captureCount: (count: number) => string
  matchCount: (matches: number, total: number) => string
  stillToRead: (shown: string, remaining: number) => string
  noMatch: (query: string) => string
  noMatchStillReading: (remaining: number) => string
  imageCopied: string
  cannotCopyImage: string
  readingText: string
  textCopiedPreview: (preview: string) => string
  noTextInCapture: string
  cannotOpenCapture: string
  movedToTrash: string
  cannotTrash: string
  cannotOpenFolder: string
  today: string
  yesterday: string
}

export type TextKey = {
  [Key in keyof Messages]: Messages[Key] extends string ? Key : never
}[keyof Messages]

export function messagesFor(locale: string): Messages {
  return locale.toLowerCase().startsWith('fr') ? fr : en
}

export function isTextKey(messages: Messages, key: string): key is TextKey {
  return key in messages && typeof messages[key as keyof Messages] === 'string'
}
