import { app } from 'electron'
import { messagesFor, type Messages } from '../shared/i18n/messages'

let messages: Messages | null = null

export function uiText(): Messages {
  messages ??= messagesFor(app.getLocale())
  return messages
}
