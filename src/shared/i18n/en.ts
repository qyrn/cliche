import type { Messages } from './messages'

export const en: Messages = {
  locale: 'en-US',
  withDetail: (message, detail) => `${message}: ${detail}`,

  trayCapture: 'Capture a region',
  trayHistory: 'History',
  trayOpenFolder: 'Open folder',
  trayLaunchAtLogin: 'Start at login',
  trayQuit: 'Quit',
  shortcutName: 'Capture a region',

  captureFailed: 'Capture failed',
  overlayUnresponsive: "The selection screen didn't respond, try again.",
  overlayCrashed: 'The selection screen crashed, try again.',
  captureCopied: 'Capture copied',
  captureAlsoIn: (folder) => `It's also saved in ${folder}.`,
  textCopied: 'Text copied',
  noTextFound: 'No text found',
  noTextFoundHint: 'Try a larger area or sharper text.',
  textReadingFailed: "Couldn't read the text",
  somethingBroke: 'Something went wrong',
  printKeyTaken: 'The Print key is already taken',
  printKeyTakenHint:
    'Another app is holding on to it. You can pick another shortcut in the KDE settings, under Shortcuts.',
  missingTools: 'cliché is missing some tools',
  installPackages: (packages) => `Install ${packages.join(', ')} so copying and text reading work.`,
  missingTool: (tool, packageName) => `${tool} can't be found, install the ${packageName} package`,
  missingReadingLanguages: (packages) => `Tesseract is missing languages, install ${packages.join(' and ')}`,
  unreadableHelperAnswer: 'The capture helper sent back something unreadable',
  noCaptureInProgress: 'No capture in progress',

  overlayToolbarLabel: 'What to do with this area',
  copy: 'Copy',
  copyText: 'Copy text',
  blur: 'Blur',
  cancel: 'Cancel',
  keyEnter: 'Enter',
  keyEscape: 'Esc',
  aimHint: 'Drag to pick an area, or click a window',
  wholeScreen: 'whole screen',
  cancelHint: 'cancel',
  blurHint: 'Drag over whatever you want to hide',
  removeLastBlur: 'remove the last one',
  finishBlur: 'done',
  searchingPersonalInfo: 'Looking for personal details…',
  personalInfoBlurred: (count) => {
    if (count === 0) {
      return 'No personal details spotted'
    }
    return count === 1 ? 'Blurred 1 personal detail' : `Blurred ${count} personal details`
  },
  personalInfoFailed: "Couldn't look for personal details",

  searchPlaceholder: 'Search a word in your captures',
  searchLabel: 'Search the text of your captures',
  openFolder: 'Open folder',
  emptyHistory: 'No captures yet. Press Print to take your first one!',
  historyTip: 'Click a capture to copy it, double-click to open it, or drag it into another app.',
  toolText: 'Text',
  toolOpen: 'Open',
  toolTrash: 'Delete',
  copyCaptureOf: (time) => `Copy the capture from ${time}`,
  captureCount: (count) => (count === 1 ? '1 capture' : `${count} captures`),
  matchCount: (matches, total) => `${matches} of ${total}`,
  stillToRead: (shown, remaining) => `${shown}, ${remaining} left to read`,
  noMatch: (query) => `No capture contains “${query}”.`,
  noMatchStillReading: (remaining) =>
    ` ${remaining} captures are still being read, they'll show up here if the word is in them.`,
  imageCopied: 'Image copied',
  cannotCopyImage: "Couldn't copy this image",
  readingText: 'Reading the text…',
  textCopiedPreview: (preview) => `Text copied: “${preview}”`,
  noTextInCapture: 'No text found in this capture',
  cannotOpenCapture: "Couldn't open this capture",
  movedToTrash: 'Capture moved to the trash',
  cannotTrash: "Couldn't delete this capture",
  cannotOpenFolder: "Couldn't open the folder",
  today: 'Today',
  yesterday: 'Yesterday'
}
