// Shared type contract between the Electron main process and the renderer.
// Keep this file dependency-free so both sides can import it cheaply.

/** Which CLI backs a session. `shell` is a plain login shell (tmux/iTerm2 vibes). */
export type CliKind = 'claude' | 'codex' | 'shell'

/**
 * The green/red/yellow radar states.
 *   running  -> yellow : the agent is actively producing output
 *   waiting  -> red    : output has settled on a prompt; it needs YOU
 *   done     -> green  : the process exited cleanly
 *   error    -> red    : the process exited non-zero (surfaced as red)
 *   idle     -> grey   : freshly spawned, nothing has happened yet
 */
export type SessionStatus = 'running' | 'waiting' | 'done' | 'error' | 'idle'

export interface CliProfile {
  kind: CliKind
  label: string
  /** Executable to spawn. */
  command: string
  /** Default args. */
  args: string[]
  /** Regexes (as source strings) that mark the tail as "waiting for a human". */
  waitingPatterns: string[]
  /** Short accent color used in the UI chrome. */
  accent: string
}

export interface SessionMeta {
  id: string
  title: string
  kind: CliKind
  status: SessionStatus
  /** Wall-clock of the last PTY output, ms epoch. */
  lastActivity: number
  /** When the session was created, ms epoch. */
  createdAt: number
  /** Exit code once the process has ended, else null. */
  exitCode: number | null
  cwd: string
  /** Membership in the broadcast group (input fan-out). */
  broadcast: boolean
}

export interface StatusCounts {
  green: number // done
  red: number // waiting + error
  yellow: number // running
  grey: number // idle
}

export interface CreateSessionRequest {
  kind: CliKind
  cwd?: string
  title?: string
  cols?: number
  rows?: number
}

// ---- IPC channel names (single source of truth) --------------------------

export const IPC = {
  // renderer -> main (invoke/handle)
  listProfiles: 'session:listProfiles',
  createSession: 'session:create',
  killSession: 'session:kill',
  writeSession: 'session:write',
  resizeSession: 'session:resize',
  listSessions: 'session:list',
  setBroadcast: 'session:setBroadcast',
  broadcastInput: 'session:broadcastInput',
  setStatusOverride: 'session:setStatusOverride',
  renameSession: 'session:rename',

  // main -> renderer (send)
  sessionData: 'session:data', // { id, data }
  sessionMeta: 'session:meta', // SessionMeta (created/updated)
  sessionClosed: 'session:closed', // { id, exitCode }
  countsChanged: 'session:counts', // StatusCounts
  focusSession: 'ui:focusSession' // id (from tray/notification click)
} as const

export interface SessionDataEvent {
  id: string
  data: string
}
export interface SessionClosedEvent {
  id: string
  exitCode: number | null
}
