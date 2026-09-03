import React from 'react'
import { useStore } from '../state/store'

/**
 * The draggable top chrome. Left side clears the macOS traffic lights; the
 * right side carries the global radar (green/red/yellow counts), the
 * broadcast toggle, and the command-palette hint.
 */
export function TitleBar(): React.JSX.Element {
  const counts = useStore((s) => s.counts)
  const broadcastMode = useStore((s) => s.broadcastMode)
  const toggleBroadcastMode = useStore((s) => s.toggleBroadcastMode)
  const setPalette = useStore((s) => s.setPalette)

  return (
    <div className="kc-titlebar">
      <div className="kc-titlebar-drag" />
      <div className="kc-titlebar-right">
        <div className="kc-radar" title="done · waiting · running">
          <span className="kc-radar-item" style={{ color: '#23d18b' }}>
            ● {counts.green}
          </span>
          <span className="kc-radar-item" style={{ color: '#f14c4c' }}>
            ● {counts.red}
          </span>
          <span className="kc-radar-item" style={{ color: '#e5c07b' }}>
            ● {counts.yellow}
          </span>
        </div>
        <button
          className={broadcastMode ? 'kc-btn kc-btn-on' : 'kc-btn'}
          onClick={toggleBroadcastMode}
          title="Broadcast input to all sessions marked for broadcast (tmux synchronize-panes)"
        >
          ⇉ Broadcast
        </button>
        <button
          className="kc-btn kc-btn-ghost"
          onClick={() => setPalette(true)}
          title="Command palette (⌘K)"
        >
          ⌘K
        </button>
      </div>
    </div>
  )
}
