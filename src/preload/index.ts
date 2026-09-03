import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type CreateSessionRequest,
  type SessionMeta,
  type StatusCounts,
  type SessionStatus,
  type CliProfile,
  type SessionDataEvent,
  type SessionClosedEvent
} from '@shared/types'

const api = {
  // request/response
  listProfiles: (): Promise<CliProfile[]> => ipcRenderer.invoke(IPC.listProfiles),
  createSession: (req: CreateSessionRequest): Promise<SessionMeta> =>
    ipcRenderer.invoke(IPC.createSession, req),
  listSessions: (): Promise<SessionMeta[]> => ipcRenderer.invoke(IPC.listSessions),
  killSession: (id: string): Promise<void> => ipcRenderer.invoke(IPC.killSession, id),
  setBroadcast: (id: string, on: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.setBroadcast, id, on),
  renameSession: (id: string, title: string): Promise<void> =>
    ipcRenderer.invoke(IPC.renameSession, id, title),
  setStatusOverride: (id: string, status: SessionStatus): Promise<void> =>
    ipcRenderer.invoke(IPC.setStatusOverride, id, status),

  // fire-and-forget
  write: (id: string, data: string): void => ipcRenderer.send(IPC.writeSession, id, data),
  resize: (id: string, cols: number, rows: number): void =>
    ipcRenderer.send(IPC.resizeSession, id, cols, rows),
  broadcastInput: (data: string): void => ipcRenderer.send(IPC.broadcastInput, data),

  // subscriptions (return an unsubscribe fn)
  onData: (cb: (e: SessionDataEvent) => void) => sub(IPC.sessionData, cb),
  onMeta: (cb: (m: SessionMeta) => void) => sub(IPC.sessionMeta, cb),
  onClosed: (cb: (e: SessionClosedEvent) => void) => sub(IPC.sessionClosed, cb),
  onCounts: (cb: (c: StatusCounts) => void) => sub(IPC.countsChanged, cb),
  onFocusSession: (cb: (id: string) => void) => sub(IPC.focusSession, cb)
}

function sub<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('keegu', api)

export type KeeguApi = typeof api
