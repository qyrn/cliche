import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type OverlayBridge, type ScreenFrame } from '../shared/types'

const overlayBridge: OverlayBridge = {
  onFrame: (listener) => {
    ipcRenderer.on(IpcChannel.OverlayFrame, (_event, frame: ScreenFrame) => listener(frame))
  },
  frameDrawn: () => ipcRenderer.send(IpcChannel.OverlayFrameDrawn),
  copy: (region) => ipcRenderer.send(IpcChannel.OverlayCopy, region),
  readText: (region) => ipcRenderer.send(IpcChannel.OverlayReadText, region),
  dismiss: () => ipcRenderer.send(IpcChannel.OverlayDismiss)
}

contextBridge.exposeInMainWorld('overlay', overlayBridge)
