export const IpcChannel = {
  OverlayFrame: 'overlay:frame',
  OverlayFrameDrawn: 'overlay:frame-drawn',
  OverlayCopy: 'overlay:copy',
  OverlayReadText: 'overlay:read-text',
  OverlayDismiss: 'overlay:dismiss',
  HistoryList: 'history:list',
  HistoryCopyImage: 'history:copy-image',
  HistoryReadText: 'history:read-text',
  HistoryOpen: 'history:open',
  HistoryOpenFolder: 'history:open-folder',
  HistoryTrash: 'history:trash',
  HistoryChanged: 'history:changed'
} as const

export interface ScreenFrame {
  width: number
  height: number
  pixels: Uint8Array
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureEntry {
  name: string
  takenAt: number
}

export interface OverlayBridge {
  onFrame(listener: (frame: ScreenFrame) => void): void
  frameDrawn(): void
  copy(region: Region): void
  readText(region: Region): void
  dismiss(): void
}

export interface HistoryBridge {
  list(): Promise<CaptureEntry[]>
  copyImage(name: string): Promise<void>
  readText(name: string): Promise<string>
  open(name: string): Promise<void>
  openFolder(): Promise<void>
  trash(name: string): Promise<void>
  onChanged(listener: () => void): void
}
