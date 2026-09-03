import React from 'react'
import { useStore, byRecency, isRed } from '../state/store'
import type { SessionMeta } from '@shared/types'
import { StatusDot } from './StatusDot'
import { Logo } from './Logo'

export function Sidebar(): React.JSX.Element {
  const pinned = useStore((s) => s.sidebarPinned)
  const hover = useStore((s) => s.sidebarHover)
  const setHover = useStore((s) => s.setHover)
  const togglePin = useStore((s) => s.togglePin)

  const sessions = useStore(byRecency)
  const recent = sessions.slice(0, 8)
  const red = sessions.filter(isRed)
  const green = sessions.filter((m) => m.status === 'done')
  const yellow = sessions.filter((m) => m.status === 'running')

  const collapsed = !pinned && !hover

  return (
    <div
      className={`kc-sidebar ${collapsed ? 'kc-sidebar-collapsed' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="kc-sidebar-head">
        <Logo />
        <button
          className={pinned ? 'kc-pin kc-pin-on' : 'kc-pin'}
          onClick={togglePin}
          title={pinned ? 'Unpin sidebar (auto-hide)' : 'Pin sidebar (keep open)'}
        >
          {pinned ? '📌' : '📍'}
        </button>
      </div>

      <NewSessionBar />

      <div className="kc-sidebar-scroll">
        <Section title="Recent" items={recent} accent="#5b8def" empty="No sessions yet" />
        <Section title="Waiting on you" items={red} accent="#f14c4c" empty="Nothing needs you" />
        <Section title="Done" items={green} accent="#23d18b" empty="Nothing finished yet" />
        <Section title="Running" items={yellow} accent="#e5c07b" empty="Nothing running" />
      </div>
    </div>
  )
}

function NewSessionBar(): React.JSX.Element {
  const newSession = useStore((s) => s.newSession)
  return (
    <div className="kc-newbar">
      <button className="kc-new kc-new-claude" onClick={() => newSession('claude')}>
        + Claude
      </button>
      <button className="kc-new kc-new-codex" onClick={() => newSession('codex')}>
        + Codex
      </button>
      <button className="kc-new kc-new-shell" onClick={() => newSession('shell')} title="Plain shell">
        + Shell
      </button>
    </div>
  )
}

function Section({
  title,
  items,
  accent,
  empty
}: {
  title: string
  items: SessionMeta[]
  accent: string
  empty: string
}): React.JSX.Element {
  return (
    <div className="kc-section">
      <div className="kc-section-title">
        <span className="kc-section-bar" style={{ background: accent }} />
        {title}
        <span className="kc-section-count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="kc-section-empty">{empty}</div>
      ) : (
        items.map((m) => <SessionRow key={m.id} meta={m} />)
      )}
    </div>
  )
}

function SessionRow({ meta }: { meta: SessionMeta }): React.JSX.Element {
  const activeId = useStore((s) => s.activeId)
  const focus = useStore((s) => s.focus)
  const splitWith = useStore((s) => s.splitWith)
  const kill = useStore((s) => s.removeSession)
  const toggleBc = useStore((s) => s.toggleSessionBroadcast)
  const active = activeId === meta.id

  return (
    <div
      className={`kc-row ${active ? 'kc-row-active' : ''}`}
      onClick={() => focus(meta.id)}
      onDoubleClick={() => splitWith(meta.id)}
      title={`${meta.title} — ${meta.cwd}`}
    >
      <StatusDot status={meta.status} />
      <span className="kc-row-title">{meta.title}</span>
      {meta.broadcast && <span className="kc-row-bc" title="In broadcast group">⇉</span>}
      <div className="kc-row-actions">
        <button
          className="kc-icon"
          title="Add as split pane"
          onClick={(e) => {
            e.stopPropagation()
            splitWith(meta.id)
          }}
        >
          ⊞
        </button>
        <button
          className="kc-icon"
          title="Toggle broadcast membership"
          onClick={(e) => {
            e.stopPropagation()
            toggleBc(meta.id)
          }}
        >
          ⇉
        </button>
        <button
          className="kc-icon kc-icon-danger"
          title="Kill session"
          onClick={(e) => {
            e.stopPropagation()
            void window.keegu.killSession(meta.id)
            kill(meta.id)
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
