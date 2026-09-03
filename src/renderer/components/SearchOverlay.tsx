import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { terminals } from '../terminalRegistry'

/** iTerm2-style find bar, scoped to the active terminal pane. */
export function SearchOverlay(): React.JSX.Element | null {
  const open = useStore((s) => s.searchOpen)
  const setSearch = useStore((s) => s.setSearch)
  const activeId = useStore((s) => s.activeId)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) queueMicrotask(() => inputRef.current?.focus())
  }, [open])

  if (!open) return null
  const addon = activeId ? terminals.search(activeId) : null

  const find = (dir: 'next' | 'prev'): void => {
    if (!addon || !q) return
    if (dir === 'next') addon.findNext(q)
    else addon.findPrevious(q)
  }

  return (
    <div className="kc-search">
      <input
        ref={inputRef}
        className="kc-search-input"
        placeholder="Find in terminal…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          if (addon) addon.findNext(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') find(e.shiftKey ? 'prev' : 'next')
          else if (e.key === 'Escape') setSearch(false)
        }}
      />
      <button className="kc-icon" title="Previous" onClick={() => find('prev')}>
        ↑
      </button>
      <button className="kc-icon" title="Next" onClick={() => find('next')}>
        ↓
      </button>
      <button className="kc-icon" title="Close" onClick={() => setSearch(false)}>
        ✕
      </button>
    </div>
  )
}
