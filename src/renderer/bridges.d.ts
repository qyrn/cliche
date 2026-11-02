import type { HistoryBridge, OverlayBridge } from '../shared/types'

declare global {
  interface Window {
    overlay: OverlayBridge
    captures: HistoryBridge
  }
}
