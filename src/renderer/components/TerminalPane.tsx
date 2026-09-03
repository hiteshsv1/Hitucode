import React, { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { terminals } from '../terminalRegistry'
import { StatusDot } from './StatusDot'
import type { SessionMeta } from '@shared/types'

/** Routes a keystroke either to one session or to the whole broadcast group. */
function inputHandler(id: string) {
  return (data: string): void => {
    const { broadcastMode, sessions } = useStore.getState()
    const meta = sessions[id]
    if (broadcastMode && meta?.broadcast) window.keegu.broadcastInput(data)
    else window.keegu.write(id, data)
  }
}

export function TerminalPane({ meta }: { meta: SessionMeta }): React.JSX.Element {
  const slotRef = useRef<HTMLDivElement>(null)
  const activeId = useStore((s) => s.activeId)
  const focus = useStore((s) => s.focus)
  const closePane = useStore((s) => s.closePane)
  const toggleZoom = useStore((s) => s.toggleZoom)
  const active = activeId === meta.id

  useEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    terminals.getOrCreate(meta.id, inputHandler(meta.id))
    terminals.mount(meta.id, slot)

    const ro = new ResizeObserver(() => {
      const size = terminals.fit(meta.id)
      if (size) window.keegu.resize(meta.id, size.cols, size.rows)
    })
    ro.observe(slot)
    return () => ro.disconnect()
  }, [meta.id])

  return (
    <div
      className={`kc-pane ${active ? 'kc-pane-active' : ''}`}
      onMouseDown={() => focus(meta.id)}
    >
      <div className="kc-pane-head">
        <StatusDot status={meta.status} size={8} />
        <span className="kc-pane-title">{meta.title}</span>
        {meta.broadcast && <span className="kc-row-bc" title="Broadcast group">⇉</span>}
        <div className="kc-pane-head-actions">
          <button className="kc-icon" title="Zoom pane (⌘⇧Z)" onClick={() => toggleZoom()}>
            ⤢
          </button>
          <button
            className="kc-icon"
            title="Close pane (keeps session)"
            onClick={() => closePane(meta.id)}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="kc-pane-term" ref={slotRef} />
    </div>
  )
}
