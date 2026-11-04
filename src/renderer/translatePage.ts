import { isTextKey, type Messages, type TextKey } from '../shared/i18n/messages'

const TRANSLATED_ATTRIBUTES = ['placeholder', 'aria-label'] as const

function textKey(messages: Messages, key: string | null): TextKey {
  if (key === null || !isTextKey(messages, key)) {
    throw new Error(`Texte inconnu : ${key}`)
  }
  return key
}

function translateTree(root: ParentNode, messages: Messages): void {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = messages[textKey(messages, element.getAttribute('data-i18n'))]
  }
  for (const attribute of TRANSLATED_ATTRIBUTES) {
    for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(
        attribute,
        messages[textKey(messages, element.getAttribute(`data-i18n-${attribute}`))]
      )
    }
  }
}

export function translatePage(messages: Messages): void {
  document.documentElement.lang = messages.locale.slice(0, 2)
  translateTree(document, messages)
  for (const template of document.querySelectorAll('template')) {
    translateTree(template.content, messages)
  }
}
