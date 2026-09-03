import { Tray, Menu, nativeImage, app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SessionManager } from './sessionManager'
import type { StatusCounts, SessionMeta } from '@shared/types'

/**
 * The menu-bar radar. On macOS the tray title renders right in the menu bar
 * as "● 2  ● 1  ● 3" (green/red/yellow), so at a glance you know how many
 * sessions are done, how many need you, and how many are still churning.
 */
export class TrayController {
  private tray: Tray | null = null

  constructor(
    private readonly manager: SessionManager,
    private readonly onFocusSession: (id: string) => void,
    private readonly onShowWindow: () => void
  ) {}

  init(): void {
    this.tray = new Tray(this.baseImage())
    this.tray.setToolTip('HituCode')
    this.render(this.manager.counts())
    this.tray.on('click', () => this.onShowWindow())
  }

  render(counts: StatusCounts): void {
    if (!this.tray) return
    // Colored dots via emoji keep it dependency-free and legible in the bar.
    const parts: string[] = []
    if (counts.green) parts.push(`🟢${counts.green}`)
    if (counts.red) parts.push(`🔴${counts.red}`)
    if (counts.yellow) parts.push(`🟡${counts.yellow}`)
    this.tray.setTitle(parts.length ? ` ${parts.join('  ')}` : ' SV')
    this.tray.setToolTip(
      `HituCode — ${counts.green} done · ${counts.red} waiting · ${counts.yellow} running`
    )
    this.rebuildMenu()
  }

  private rebuildMenu(): void {
    if (!this.tray) return
    const sessions = this.manager.list()
    const section = (label: string, list: SessionMeta[]) =>
      list.length
        ? [
            { label, enabled: false } as Electron.MenuItemConstructorOptions,
            ...list.map((s) => ({
              label: `   ${dot(s)} ${s.title}`,
              click: () => this.onFocusSession(s.id)
            }))
          ]
        : []

    const menu = Menu.buildFromTemplate([
      { label: 'Open HituCode', click: () => this.onShowWindow() },
      { type: 'separator' },
      ...section('Waiting on you', sessions.filter((s) => isRed(s))),
      ...section('Running', sessions.filter((s) => s.status === 'running')),
      ...section('Done', sessions.filter((s) => s.status === 'done')),
      { type: 'separator' },
      { label: 'Quit HituCode', click: () => app.quit() }
    ])
    this.tray.setContextMenu(menu)
  }

  private baseImage(): Electron.NativeImage {
    // Prefer a bundled template icon if the user drops one in; otherwise fall
    // back to an empty image and rely on the text title.
    const p = join(process.env.RESOURCES_PATH || app.getAppPath(), 'resources', 'trayTemplate.png')
    if (existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      img.setTemplateImage(true)
      return img
    }
    return nativeImage.createEmpty()
  }

  dispose(): void {
    this.tray?.destroy()
    this.tray = null
  }
}

function isRed(s: SessionMeta): boolean {
  return s.status === 'waiting' || s.status === 'error'
}
function dot(s: SessionMeta): string {
  if (isRed(s)) return '🔴'
  if (s.status === 'running') return '🟡'
  if (s.status === 'done') return '🟢'
  return '⚪️'
}
