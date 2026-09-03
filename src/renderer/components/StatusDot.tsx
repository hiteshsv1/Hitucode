import React from 'react'
import type { SessionStatus } from '@shared/types'

const COLOR: Record<SessionStatus, string> = {
  running: '#e5c07b', // yellow
  waiting: '#f14c4c', // red
  error: '#f14c4c',
  done: '#23d18b', // green
  idle: '#6b7280' // grey
}

const LABEL: Record<SessionStatus, string> = {
  running: 'Running',
  waiting: 'Waiting on you',
  error: 'Exited with error',
  done: 'Done',
  idle: 'Idle'
}

export function StatusDot({
  status,
  size = 9,
  pulse
}: {
  status: SessionStatus
  size?: number
  pulse?: boolean
}): React.JSX.Element {
  const animate = pulse ?? (status === 'running' || status === 'waiting')
  return (
    <span
      title={LABEL[status]}
      className={animate ? 'kc-dot kc-dot-pulse' : 'kc-dot'}
      style={{
        width: size,
        height: size,
        background: COLOR[status],
        boxShadow: `0 0 ${status === 'waiting' ? 7 : 4}px ${COLOR[status]}`
      }}
    />
  )
}
