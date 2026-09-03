import React, { useState } from 'react'
import { useStore, sessionList } from '../state/store'

/**
 * The tmux "synchronize-panes" line. Type once, hit ⏎, and the same prompt
 * lands in every session flagged for broadcast — the fastest way to ask
 * Claude and Codex the identical question and diff their answers.
 */
export function BroadcastBar(): React.JSX.Element | null {
  const on = useStore((s) => s.broadcastMode)
  const members = useStore(sessionList).filter((m) => m.broadcast)
  const [text, setText] = useState('')

  if (!on) return null

  const send = (): void => {
    if (!text) return
    window.keegu.broadcastInput(text + '\r')
    setText('')
  }

  return (
    <div className="kc-broadcast">
      <span className="kc-broadcast-label" title="Sessions receiving broadcast input">
        ⇉ {members.length} target{members.length === 1 ? '' : 's'}
      </span>
      <input
        className="kc-broadcast-input"
        placeholder={
          members.length
            ? 'Type a prompt for all broadcast sessions, then Enter…'
            : 'No sessions in the broadcast group — toggle ⇉ on some first'
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send()
        }}
      />
      <button className="kc-btn kc-btn-on" onClick={send} disabled={!members.length}>
        Send to all
      </button>
    </div>
  )
}
