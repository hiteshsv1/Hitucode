import type { CliProfile, SessionStatus } from '@shared/types'

/**
 * StatusDetector — the green/red/yellow radar for a single session.
 *
 * Think of it like a smoke detector wired to the terminal's output stream:
 *  - while bytes are flowing, the "engine" is warm  -> running (yellow)
 *  - when the stream goes quiet AND the last thing printed looks like a
 *    prompt, it's parked waiting for a human   -> waiting (red)
 *  - if it goes quiet for a long time even without an obvious prompt, we
 *    assume it's blocked on you                -> waiting (red)
 *  - process exit is terminal                  -> done/error (green/red)
 *
 * It emits a status only when the status actually changes, so callers can
 * treat every callback as an edge, not a level.
 */

const SETTLE_MS = 1200 // output must be quiet this long before we judge it
const DEEP_IDLE_MS = 10_000 // quiet this long => assume it's waiting on you
const TAIL_LIMIT = 4096 // chars of trailing output we keep for matching

// Standard ansi-regex, built from an escaped source string so no literal
// control characters appear in this file.
const ANSI = new RegExp(
  '[\\u001B\\u009B][[\\]()#;?]*' +
    '(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)|' +
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  'g'
)

export class StatusDetector {
  private tail = ''
  private status: SessionStatus = 'idle'
  private settleTimer: ReturnType<typeof setTimeout> | null = null
  private deepIdleTimer: ReturnType<typeof setTimeout> | null = null
  private readonly waitingRegexes: RegExp[]

  constructor(
    profile: CliProfile,
    private readonly onChange: (status: SessionStatus) => void
  ) {
    this.waitingRegexes = profile.waitingPatterns.map((p) => new RegExp(p, 'im'))
  }

  get current(): SessionStatus {
    return this.status
  }

  /** Feed raw PTY output. Marks the session running and (re)arms timers. */
  feed(data: string): void {
    this.tail = (this.tail + data.replace(ANSI, '')).slice(-TAIL_LIMIT)
    this.transition('running')
    this.armTimers()
  }

  /** The process exited. */
  end(exitCode: number | null): void {
    this.clearTimers()
    this.transition(exitCode && exitCode !== 0 ? 'error' : 'done')
  }

  /** Manual override from the UI. */
  override(status: SessionStatus): void {
    this.clearTimers()
    this.transition(status)
  }

  dispose(): void {
    this.clearTimers()
  }

  private armTimers(): void {
    this.clearTimers()
    this.settleTimer = setTimeout(() => this.evaluateSettle(), SETTLE_MS)
    this.deepIdleTimer = setTimeout(() => this.transition('waiting'), DEEP_IDLE_MS)
  }

  private evaluateSettle(): void {
    // Only meaningful while we still think it's running.
    if (this.status !== 'running') return
    const tail = this.tail.trimEnd()
    if (this.waitingRegexes.some((re) => re.test(tail))) {
      this.clearTimers()
      this.transition('waiting')
    }
    // else: no obvious prompt — leave it running; the deep-idle timer is the
    // backstop that flips it to waiting if it truly stalls.
  }

  private transition(next: SessionStatus): void {
    if (next === this.status) return
    this.status = next
    this.onChange(next)
  }

  private clearTimers(): void {
    if (this.settleTimer) clearTimeout(this.settleTimer)
    if (this.deepIdleTimer) clearTimeout(this.deepIdleTimer)
    this.settleTimer = null
    this.deepIdleTimer = null
  }
}
