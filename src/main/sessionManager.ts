import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import * as pty from 'node-pty'
import type { IPty } from 'node-pty'
import { profileFor } from '@shared/cliProfiles'
import type {
  CreateSessionRequest,
  SessionMeta,
  SessionStatus,
  StatusCounts,
  CliKind
} from '@shared/types'
import { StatusDetector } from './statusEngine'

interface Session {
  meta: SessionMeta
  proc: IPty
  detector: StatusDetector
}

/**
 * SessionManager owns every live CLI process. It is the single writer of
 * session state, so the tray, notifications and renderer can all treat its
 * events as gospel.
 *
 * Events:
 *   'data'    (id, data)        raw PTY output
 *   'meta'    (SessionMeta)     a session was created or its metadata changed
 *   'closed'  (id, exitCode)
 *   'counts'  (StatusCounts)
 *   'waiting' (SessionMeta)     a session just flipped to red — notify the human
 */
export class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>()

  create(req: CreateSessionRequest): SessionMeta {
    const profile = profileFor(req.kind)
    const id = randomUUID()
    const cwd = req.cwd || homedir()
    const now = Date.now()

    const proc = pty.spawn(profile.command, profile.args, {
      name: 'xterm-256color',
      cols: req.cols ?? 80,
      rows: req.rows ?? 24,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color', KEEGUCODE: '1' }
    })

    const meta: SessionMeta = {
      id,
      title: req.title || defaultTitle(req.kind, this.countKind(req.kind) + 1),
      kind: req.kind,
      status: 'idle',
      lastActivity: now,
      createdAt: now,
      exitCode: null,
      cwd,
      broadcast: false
    }

    const detector = new StatusDetector(profile, (status) =>
      this.applyStatus(id, status)
    )

    proc.onData((data) => {
      const s = this.sessions.get(id)
      if (!s) return
      s.meta.lastActivity = Date.now()
      detector.feed(data)
      this.emit('data', id, data)
    })

    proc.onExit(({ exitCode }) => {
      detector.end(exitCode)
      const s = this.sessions.get(id)
      if (s) s.meta.exitCode = exitCode
      this.emit('closed', id, exitCode)
    })

    this.sessions.set(id, { meta, proc, detector })
    this.emit('meta', { ...meta })
    this.emitCounts()
    return { ...meta }
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.proc.write(data)
  }

  /** Fan input out to every session currently in the broadcast group. */
  broadcastInput(data: string): string[] {
    const targets: string[] = []
    for (const s of this.sessions.values()) {
      if (s.meta.broadcast) {
        s.proc.write(data)
        targets.push(s.meta.id)
      }
    }
    return targets
  }

  setBroadcast(id: string, on: boolean): void {
    const s = this.sessions.get(id)
    if (!s) return
    s.meta.broadcast = on
    this.emit('meta', { ...s.meta })
  }

  resize(id: string, cols: number, rows: number): void {
    const s = this.sessions.get(id)
    if (!s) return
    try {
      s.proc.resize(Math.max(cols, 1), Math.max(rows, 1))
    } catch {
      /* pty may have exited between render and resize */
    }
  }

  rename(id: string, title: string): void {
    const s = this.sessions.get(id)
    if (!s) return
    s.meta.title = title
    this.emit('meta', { ...s.meta })
  }

  setStatusOverride(id: string, status: SessionStatus): void {
    this.sessions.get(id)?.detector.override(status)
  }

  kill(id: string): void {
    const s = this.sessions.get(id)
    if (!s) return
    try {
      s.proc.kill()
    } catch {
      /* already dead */
    }
    s.detector.dispose()
    this.sessions.delete(id)
    this.emit('closed', id, s.meta.exitCode)
    this.emitCounts()
  }

  list(): SessionMeta[] {
    return [...this.sessions.values()].map((s) => ({ ...s.meta }))
  }

  counts(): StatusCounts {
    const c: StatusCounts = { green: 0, red: 0, yellow: 0, grey: 0 }
    for (const s of this.sessions.values()) bucket(c, s.meta.status)
    return c
  }

  disposeAll(): void {
    for (const s of this.sessions.values()) {
      try {
        s.proc.kill()
      } catch {
        /* ignore */
      }
      s.detector.dispose()
    }
    this.sessions.clear()
  }

  // --- internal -------------------------------------------------------------

  private applyStatus(id: string, status: SessionStatus): void {
    const s = this.sessions.get(id)
    if (!s || s.meta.status === status) return
    const wasWaiting = s.meta.status === 'waiting'
    s.meta.status = status
    this.emit('meta', { ...s.meta })
    this.emitCounts()
    if (status === 'waiting' && !wasWaiting) this.emit('waiting', { ...s.meta })
  }

  private emitCounts(): void {
    this.emit('counts', this.counts())
  }

  private countKind(kind: CliKind): number {
    let n = 0
    for (const s of this.sessions.values()) if (s.meta.kind === kind) n++
    return n
  }
}

function bucket(c: StatusCounts, status: SessionStatus): void {
  switch (status) {
    case 'done':
      c.green++
      break
    case 'waiting':
    case 'error':
      c.red++
      break
    case 'running':
      c.yellow++
      break
    default:
      c.grey++
  }
}

function defaultTitle(kind: CliKind, n: number): string {
  const base = kind === 'claude' ? 'Claude' : kind === 'codex' ? 'Codex' : 'Shell'
  return `${base} ${n}`
}
