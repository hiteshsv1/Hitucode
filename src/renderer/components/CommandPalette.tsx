import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useStore, byRecency } from '../state/store'
import { StatusDot } from './StatusDot'

interface Command {
  id: string
  label: string
  hint?: string
  run: () => void
}

export function CommandPalette(): React.JSX.Element | null {
  const open = useStore((s) => s.paletteOpen)
  const setPalette = useStore((s) => s.setPalette)
  const sessions = useStore(byRecency)
  const s = useStore.getState()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: 'new-claude', label: 'New Claude session', hint: '⌘T', run: () => s.newSession('claude') },
      { id: 'new-codex', label: 'New Codex session', run: () => s.newSession('codex') },
      { id: 'new-shell', label: 'New shell session', run: () => s.newSession('shell') },
      { id: 'broadcast', label: 'Toggle broadcast mode', hint: 'tmux sync', run: () => s.toggleBroadcastMode() },
      { id: 'zoom', label: 'Zoom / unzoom active pane', hint: '⌘⇧Z', run: () => s.toggleZoom() },
      { id: 'find', label: 'Find in terminal', hint: '⌘F', run: () => s.setSearch(true) },
      { id: 'pin', label: s.sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar', run: () => s.togglePin() }
    ]
    const sessionCmds: Command[] = sessions.map((m) => ({
      id: 'focus-' + m.id,
      label: 'Go to: ' + m.title,
      hint: m.status,
      run: () => s.focus(m.id)
    }))
    return [...base, ...sessionCmds]
  }, [sessions, s])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(needle))
  }, [q, commands])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const close = (): void => setPalette(false)
  const runAt = (i: number): void => {
    const cmd = filtered[i]
    if (cmd) {
      cmd.run()
      close()
    }
  }

  return (
    <div className="kc-palette-backdrop" onMouseDown={close}>
      <div className="kc-palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="kc-palette-input"
          placeholder="Type a command or session name…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setSel((i) => Math.min(i + 1, filtered.length - 1))
            else if (e.key === 'ArrowUp') setSel((i) => Math.max(i - 1, 0))
            else if (e.key === 'Enter') runAt(sel)
            else if (e.key === 'Escape') close()
          }}
        />
        <div className="kc-palette-list">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`kc-palette-item ${i === sel ? 'kc-palette-item-sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => runAt(i)}
            >
              {c.id.startsWith('focus-') && (
                <StatusDot
                  status={sessions.find((m) => 'focus-' + m.id === c.id)?.status ?? 'idle'}
                  size={7}
                />
              )}
              <span className="kc-palette-label">{c.label}</span>
              {c.hint && <span className="kc-palette-hint">{c.hint}</span>}
            </div>
          ))}
          {filtered.length === 0 && <div className="kc-palette-empty">No matches</div>}
        </div>
      </div>
    </div>
  )
}
