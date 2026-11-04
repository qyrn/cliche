import type { Messages } from './messages'

export const fr: Messages = {
  locale: 'fr-FR',
  withDetail: (message, detail) => `${message} : ${detail}`,

  trayCapture: 'Capturer une zone',
  trayHistory: 'Historique',
  trayOpenFolder: 'Ouvrir le dossier',
  trayLaunchAtLogin: "Lancer à l'ouverture de session",
  trayQuit: 'Quitter',
  shortcutName: 'Capturer une zone',

  captureFailed: 'La capture a échoué',
  overlayUnresponsive: "L'écran de sélection n'a pas répondu, réessaie.",
  overlayCrashed: "L'écran de sélection a planté, réessaie.",
  captureCopied: 'Capture copiée',
  captureAlsoIn: (folder) => `Tu la retrouves aussi dans ${folder}.`,
  textCopied: 'Texte copié',
  noTextFound: 'Aucun texte trouvé',
  noTextFoundHint: 'Essaie avec une zone plus large ou un texte plus net.',
  textReadingFailed: 'La lecture du texte a échoué',
  somethingBroke: 'Quelque chose a planté',
  printKeyTaken: 'La touche Impr est déjà prise',
  printKeyTakenHint:
    'Une autre app la garde pour elle. Tu peux choisir un autre raccourci dans les réglages KDE, rubrique Raccourcis.',
  missingTools: 'Il manque des outils à cliché',
  installPackages: (packages) =>
    `Installe ${packages.join(', ')} pour que la copie et la lecture du texte marchent.`,
  missingTool: (tool, packageName) => `${tool} est introuvable, installe le paquet ${packageName}`,
  missingReadingLanguages: (packages) =>
    `Il manque des langues à Tesseract, installe ${packages.join(' et ')}`,
  unreadableHelperAnswer: 'Réponse illisible du helper de capture',
  noCaptureInProgress: 'Aucune capture en cours',

  overlayToolbarLabel: 'Que faire de cette zone',
  copy: 'Copier',
  copyText: 'Copier le texte',
  blur: 'Flouter',
  cancel: 'Annuler',
  keyEnter: 'Entrée',
  keyEscape: 'Échap',
  aimHint: 'Glisse pour choisir une zone, ou clique sur une fenêtre',
  wholeScreen: "tout l'écran",
  cancelHint: 'annuler',
  blurHint: 'Glisse sur ce que tu veux flouter',
  removeLastBlur: 'retirer le dernier',
  finishBlur: 'terminer',
  searchingPersonalInfo: 'Recherche des infos perso…',
  personalInfoBlurred: (count) => {
    if (count === 0) {
      return 'Aucune info perso repérée'
    }
    return count === 1 ? '1 info perso floutée' : `${count} infos perso floutées`
  },
  personalInfoFailed: 'Impossible de chercher les infos perso',

  searchPlaceholder: 'Chercher un mot dans tes captures',
  searchLabel: 'Chercher dans le texte des captures',
  openFolder: 'Ouvrir le dossier',
  emptyHistory: "Aucune capture pour l'instant. Appuie sur Impr pour faire la première !",
  historyTip:
    "Clique sur une capture pour la copier, double-clique pour l'ouvrir, ou glisse-la dans une autre app.",
  toolText: 'Texte',
  toolOpen: 'Ouvrir',
  toolTrash: 'Supprimer',
  copyCaptureOf: (time) => `Copier la capture de ${time}`,
  captureCount: (count) => (count === 1 ? '1 capture' : `${count} captures`),
  matchCount: (matches, total) => `${matches} sur ${total}`,
  stillToRead: (shown, remaining) => `${shown}, encore ${remaining} à lire`,
  noMatch: (query) => `Aucune capture ne contient « ${query} ».`,
  noMatchStillReading: (remaining) =>
    ` Il reste ${remaining} captures à lire, elles s'afficheront ici si le mot y est.`,
  imageCopied: 'Image copiée',
  cannotCopyImage: 'Impossible de copier cette image',
  readingText: 'Lecture du texte…',
  textCopiedPreview: (preview) => `Texte copié : « ${preview} »`,
  noTextInCapture: 'Aucun texte trouvé dans cette capture',
  cannotOpenCapture: "Impossible d'ouvrir cette capture",
  movedToTrash: 'Capture mise à la corbeille',
  cannotTrash: 'Impossible de supprimer cette capture',
  cannotOpenFolder: "Impossible d'ouvrir le dossier",
  today: "Aujourd'hui",
  yesterday: 'Hier'
}
