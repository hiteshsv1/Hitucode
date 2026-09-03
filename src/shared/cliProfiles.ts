import type { CliProfile, CliKind } from './types'

// Prompt/waiting signatures per CLI. These are heuristics — tune freely.
// A session flips to `waiting` (red) when its output settles and the tail
// buffer matches one of these OR a generic shell prompt.

const GENERIC_WAITING = [
  // interactive yes/no questions
  '\\((?:y\\/n|yes\\/no|Y\\/n|y\\/N)\\)\\s*$',
  '\\?\\s*$', // a line ending in a question mark and whitespace
  '(?:press|hit)\\s+enter', // "press enter to continue"
  '❯\\s*$', // fancy prompt caret used by many TUIs
  '›\\s*$'
]

export const CLI_PROFILES: Record<CliKind, CliProfile> = {
  claude: {
    kind: 'claude',
    label: 'Claude CLI',
    command: 'claude',
    args: [],
    accent: '#d97757',
    waitingPatterns: [
      ...GENERIC_WAITING,
      'Human:\\s*$',
      'Do you want to proceed',
      'Would you like'
    ]
  },
  codex: {
    kind: 'codex',
    label: 'Codex CLI',
    command: 'codex',
    args: [],
    accent: '#10a37f',
    waitingPatterns: [
      ...GENERIC_WAITING,
      'Allow command',
      'Approve',
      'proceed\\?'
    ]
  },
  shell: {
    kind: 'shell',
    label: 'Shell',
    command: process.env.SHELL || '/bin/zsh',
    args: ['-l'],
    accent: '#5b8def',
    waitingPatterns: [
      // generic shell prompt: ends in $, #, %, > possibly after path
      '[\\$#%>]\\s*$'
    ]
  }
}

export function profileFor(kind: CliKind): CliProfile {
  return CLI_PROFILES[kind]
}
