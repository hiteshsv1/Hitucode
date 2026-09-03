import React from 'react'

/** The KC KeeguCode mark that sits above the sidebar, top-left. */
export function Logo(): React.JSX.Element {
  return (
    <div className="kc-logo" title="KeeguCode">
      <div className="kc-logo-badge">KC</div>
      <div className="kc-logo-text">
        <span className="kc-logo-name">KeeguCode</span>
        <span className="kc-logo-sub">multi-agent terminal</span>
      </div>
    </div>
  )
}
