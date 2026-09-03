import React from 'react'
import { useStore } from '../state/store'
import { TerminalPane } from './TerminalPane'
import { BroadcastBar } from './BroadcastBar'

export function Workspace(): React.JSX.Element {
  const sessions = useStore((s) => s.sessions)
  const visiblePanes = useStore((s) => s.visiblePanes)
  const activeId = useStore((s) => s.activeId)
  const zoomed = useStore((s) => s.zoomed)
  const newSession = useStore((s) => s.newSession)

  const panes = visiblePanes.map((id) => sessions[id]).filter(Boolean)
  const shown = zoomed && activeId ? panes.filter((p) => p.id === activeId) : panes
  const cols = shown.length <= 1 ? '1fr' : '1fr 1fr'

  return (
    <div className="kc-workspace">
      {panes.length === 0 ? (
        <div className="kc-empty">
          <div className="kc-empty-badge">KC</div>
          <h1>Welcome to KeeguCode</h1>
          <p>
            Run Claude CLI and Codex CLI side by side. Start a session, split panes like tmux,
            broadcast one prompt to both, and let the menu-bar radar tell you which sessions are
            waiting on you.
          </p>
          <div className="kc-empty-actions">
            <button className="kc-new kc-new-claude" onClick={() => newSession('claude')}>
              + New Claude session
            </button>
            <button className="kc-new kc-new-codex" onClick={() => newSession('codex')}>
              + New Codex session
            </button>
            <button className="kc-new kc-new-shell" onClick={() => newSession('shell')}>
              + New shell
            </button>
          </div>
          <div className="kc-empty-hints">
            <span>⌘K command palette</span>
            <span>⌘T new session</span>
            <span>⌘D split</span>
            <span>⌘F find</span>
          </div>
        </div>
      ) : (
        <div className="kc-grid" style={{ gridTemplateColumns: cols }}>
          {shown.map((meta) => (
            <TerminalPane key={meta.id} meta={meta} />
          ))}
        </div>
      )}
      <BroadcastBar />
    </div>
  )
}
