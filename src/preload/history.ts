import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type HistoryBridge, type KnownTexts } from '../shared/types'

const historyBridge: HistoryBridge = {
  list: () => ipcRenderer.invoke(IpcChannel.HistoryList),
  copyImage: (name) => ipcRenderer.invoke(IpcChannel.HistoryCopyImage, name),
  readText: (name) => ipcRenderer.invoke(IpcChannel.HistoryReadText, name),
  open: (name) => ipcRenderer.invoke(IpcChannel.HistoryOpen, name),
  openFolder: () => ipcRenderer.invoke(IpcChannel.HistoryOpenFolder),
  trash: (name) => ipcRenderer.invoke(IpcChannel.HistoryTrash, name),
  startDrag: (name) => ipcRenderer.send(IpcChannel.HistoryStartDrag, name),
  texts: () => ipcRenderer.invoke(IpcChannel.HistoryTexts),
  onTextsRead: (listener) => {
    ipcRenderer.on(IpcChannel.HistoryTextsRead, (_event, update: KnownTexts) => listener(update))
  },
  onChanged: (listener) => {
    ipcRenderer.on(IpcChannel.HistoryChanged, () => listener())
  }
}

contextBridge.exposeInMainWorld('captures', historyBridge)
