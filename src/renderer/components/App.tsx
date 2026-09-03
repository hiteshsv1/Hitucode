import React, { useEffect } from 'react'
import { useStore } from '../state/store'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import { Workspace } from './Workspace'
import { CommandPalette } from './CommandPalette'
import { SearchOverlay } from './SearchOverlay'

export function App(): React.JSX.Element {
  const bootstrap = useStore((s) => s.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const s = useStore.getState()
      const key = e.key.toLowerCase()

      if (key === 'k') {
        e.preventDefault()
        s.setPalette(!s.paletteOpen)
      } else if (key === 't' && e.shiftKey) {
        e.preventDefault()
        void s.newSession('codex')
      } else if (key === 't') {
        e.preventDefault()
        void s.newSession('claude')
      } else if (key === 'd') {
        e.preventDefault()
        void s.newSession('shell') // open a split alongside current work
      } else if (key === 'f') {
        e.preventDefault()
        s.setSearch(true)
      } else if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        s.toggleZoom()
      } else if (key === 'b') {
        e.preventDefault()
        s.toggleBroadcastMode()
      } else if (key === 'w') {
        if (s.activeId) {
          e.preventDefault()
          s.closePane(s.activeId)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="kc-app">
      <TitleBar />
      <div className="kc-body">
        <Sidebar />
        <Workspace />
      </div>
      <CommandPalette />
      <SearchOverlay />
    </div>
  )
}
