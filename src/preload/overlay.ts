import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type OverlayBridge, type ScreenFrame } from '../shared/types'

const overlayBridge: OverlayBridge = {
  onFrame: (listener) => {
    ipcRenderer.on(IpcChannel.OverlayFrame, (_event, frame: ScreenFrame) => listener(frame))
  },
  frameDrawn: () => ipcRenderer.send(IpcChannel.OverlayFrameDrawn),
  copy: (request) => ipcRenderer.send(IpcChannel.OverlayCopy, request),
  readText: (request) => ipcRenderer.send(IpcChannel.OverlayReadText, request),
  findPersonalInfo: (zone) => ipcRenderer.invoke(IpcChannel.OverlayFindPersonalInfo, zone),
  dismiss: () => ipcRenderer.send(IpcChannel.OverlayDismiss)
}

contextBridge.exposeInMainWorld('overlay', overlayBridge)
