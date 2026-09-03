import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { join } from 'node:path'
import { SessionManager } from './sessionManager'
import { TrayController } from './tray'
import { CLI_PROFILES } from '@shared/cliProfiles'
import {
  IPC,
  type CreateSessionRequest,
  type SessionMeta,
  type StatusCounts,
  type SessionStatus
} from '@shared/types'

let mainWindow: BrowserWindow | null = null
const manager = new SessionManager()
let tray: TrayController | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function send(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

function focusSession(id: string): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
  send(IPC.focusSession, id)
}

// ---- wire SessionManager -> renderer + tray + notifications ---------------

manager.on('data', (id: string, data: string) => send(IPC.sessionData, { id, data }))
manager.on('meta', (meta: SessionMeta) => send(IPC.sessionMeta, meta))
manager.on('closed', (id: string, exitCode: number | null) =>
  send(IPC.sessionClosed, { id, exitCode })
)
manager.on('counts', (counts: StatusCounts) => {
  send(IPC.countsChanged, counts)
  tray?.render(counts)
})
manager.on('waiting', (meta: SessionMeta) => {
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: 'HituCode — session needs you',
    body: `“${meta.title}” is waiting on your response.`,
    silent: false
  })
  n.on('click', () => focusSession(meta.id))
  n.show()
})

// ---- IPC handlers (renderer -> main) --------------------------------------

function registerIpc(): void {
  ipcMain.handle(IPC.listProfiles, () => Object.values(CLI_PROFILES))
  ipcMain.handle(IPC.createSession, (_e, req: CreateSessionRequest) => manager.create(req))
  ipcMain.handle(IPC.listSessions, () => manager.list())
  ipcMain.handle(IPC.killSession, (_e, id: string) => manager.kill(id))
  ipcMain.on(IPC.writeSession, (_e, id: string, data: string) => manager.write(id, data))
  ipcMain.on(IPC.resizeSession, (_e, id: string, cols: number, rows: number) =>
    manager.resize(id, cols, rows)
  )
  ipcMain.on(IPC.broadcastInput, (_e, data: string) => manager.broadcastInput(data))
  ipcMain.handle(IPC.setBroadcast, (_e, id: string, on: boolean) => manager.setBroadcast(id, on))
  ipcMain.handle(IPC.renameSession, (_e, id: string, title: string) => manager.rename(id, title))
  ipcMain.handle(IPC.setStatusOverride, (_e, id: string, status: SessionStatus) =>
    manager.setStatusOverride(id, status)
  )
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  tray = new TrayController(manager, focusSession, () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
  tray.init()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

// Keep running in the menu bar even when all windows are closed (macOS feel).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  manager.disposeAll()
  tray?.dispose()
})
