import React from 'react'

/** The SV HituCode mark that sits above the sidebar, top-left. */
export function Logo(): React.JSX.Element {
  return (
    <div className="kc-logo" title="HituCode">
      <div className="kc-logo-badge">SV</div>
      <div className="kc-logo-text">
        <span className="kc-logo-name">HituCode</span>
        <span className="kc-logo-sub">multi-agent terminal</span>
      </div>
    </div>
  )
}
