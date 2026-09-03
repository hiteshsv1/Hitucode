import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'

// Cursor-flavored dark palette.
const THEME = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#e0af68',
  selectionBackground: '#264f78',
  black: '#1e1e1e',
  brightBlack: '#5c6370',
  red: '#f14c4c',
  green: '#23d18b',
  yellow: '#e5c07b',
  blue: '#569cd6',
  magenta: '#c586c0',
  cyan: '#56b6c2',
  white: '#d4d4d4'
}

interface Entry {
  term: Terminal
  fit: FitAddon
  search: SearchAddon
  /** Persistent host element — moved between panes without re-opening xterm. */
  wrapper: HTMLDivElement
  buffer: string[]
  opened: boolean
}

/**
 * One xterm instance per session, kept alive for the app's lifetime so
 * scrollback survives tab switches and splits. Each terminal lives in a
 * persistent wrapper <div> that we physically move (appendChild) into
 * whichever pane slot is showing it — the DOM node relocates, the terminal
 * keeps its state.
 */
class TerminalRegistry {
  private entries = new Map<string, Entry>()
  private holder: HTMLDivElement | null = null

  private offscreen(): HTMLDivElement {
    if (!this.holder) {
      this.holder = document.createElement('div')
      this.holder.style.position = 'absolute'
      this.holder.style.left = '-99999px'
      this.holder.style.top = '0'
      this.holder.style.width = '800px'
      this.holder.style.height = '600px'
      document.body.appendChild(this.holder)
    }
    return this.holder
  }

  getOrCreate(id: string, onInput: (data: string) => void): Entry {
    let e = this.entries.get(id)
    if (e) return e

    const term = new Terminal({
      fontFamily:
        'SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.15,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 10000,
      theme: THEME
    })
    const fit = new FitAddon()
    const search = new SearchAddon()
    term.loadAddon(fit)
    term.loadAddon(search)
    term.loadAddon(new WebLinksAddon())

    const wrapper = document.createElement('div')
    wrapper.className = 'kc-term-wrapper'
    this.offscreen().appendChild(wrapper)

    e = { term, fit, search, wrapper, buffer: [], opened: false }
    this.entries.set(id, e)

    term.onData(onInput)
    return e
  }

  /** Attach the terminal to a pane slot. Opens xterm lazily on first mount. */
  mount(id: string, slot: HTMLElement): void {
    const e = this.entries.get(id)
    if (!e) return
    slot.appendChild(e.wrapper)
    if (!e.opened) {
      e.term.open(e.wrapper)
      e.opened = true
      for (const chunk of e.buffer) e.term.write(chunk)
      e.buffer = []
    }
    this.fit(id)
  }

  /** Park the terminal offscreen (preserves everything) when its pane closes. */
  unmount(id: string): void {
    const e = this.entries.get(id)
    if (e) this.offscreen().appendChild(e.wrapper)
  }

  write(id: string, data: string): void {
    const e = this.entries.get(id)
    if (!e) return
    if (e.opened) e.term.write(data)
    else e.buffer.push(data)
  }

  fit(id: string): { cols: number; rows: number } | null {
    const e = this.entries.get(id)
    if (!e || !e.opened) return null
    try {
      e.fit.fit()
      return { cols: e.term.cols, rows: e.term.rows }
    } catch {
      return null
    }
  }

  focus(id: string): void {
    this.entries.get(id)?.term.focus()
  }

  search(id: string): SearchAddon | null {
    return this.entries.get(id)?.search ?? null
  }

  dispose(id: string): void {
    const e = this.entries.get(id)
    if (!e) return
    e.term.dispose()
    e.wrapper.remove()
    this.entries.delete(id)
  }
}

export const terminals = new TerminalRegistry()
