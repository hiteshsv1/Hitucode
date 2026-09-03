# HituCode

**A Cursor-style desktop cockpit for running Claude CLI and Codex CLI side by side.**

HituCode wraps the two agent CLIs (plus plain shells) in one dark, Cursor-flavored
window. Run several sessions at once, split them like tmux, broadcast one prompt to
both agents, and let a menu-bar radar tell you — at a glance — which sessions are
**done**, which are **waiting on you**, and which are **still running**.

> Think of it as a mission-control wall for AI coding agents: every session is a
> monitor on the wall, each with a colored light. Green means landed, yellow means
> in-flight, red means the pilot needs you on the radio.

---

## Feature highlights

### The green / red / yellow radar (the headline feature)
HituCode watches each session's terminal output and classifies it automatically:

| Light | State | How it's detected |
| --- | --- | --- |
| 🟡 Yellow | **Running** | bytes are actively streaming from the CLI |
| 🔴 Red | **Waiting on you** | output settled on a prompt pattern, or stalled for 10s |
| 🟢 Green | **Done** | the process exited cleanly |

- **Menu-bar status icon** shows live counts, e.g. `🟢2  🔴1  🟡3`, and a click-through
  menu grouped by state.
- **Native notification** fires the moment a session flips to red ("_'Claude 1' is
  waiting on your response_"). Click it to jump straight to that session.
- Detection is heuristic and tunable per CLI in
  [`src/shared/cliProfiles.ts`](src/shared/cliProfiles.ts) — add your own prompt
  signatures.

### Run Claude + Codex at the same time, both ways
- Each session is a fully interactive PTY: you type, the agent responds.
- **Broadcast mode** (tmux `synchronize-panes`): flag any sessions for broadcast, then
  send one prompt to all of them at once and compare Claude's answer against Codex's
  side by side.

### Cursor-style interface
- Hidden-inset title bar, dark VS Code/Cursor palette, left activity sidebar.
- **SV HituCode** logo top-left, above the sidebar.
- **Pinnable sidebar** — pin it open or unpin to auto-hide-on-hover (📌 / 📍).
- Sidebar sections: **Recent**, **Waiting on you**, **Done**, **Running**.
- **Command palette** (`⌘K`) to jump to any session or run any action.

### iTerm2 + tmux muscle
| Capability | HituCode |
| --- | --- |
| Split panes (grid up to 4) | ✅ double-click a session / `⌘D` / sidebar ⊞ |
| Pane zoom / unzoom | ✅ `⌘⇧Z` or the ⤢ button |
| Broadcast input to panes (tmux `synchronize-panes`) | ✅ Broadcast bar |
| Find in terminal (iTerm2 find) | ✅ `⌘F` |
| Command palette | ✅ `⌘K` |
| Persistent scrollback across tab/pane moves | ✅ terminals never lose state |
| 256-color, web links, true PTY | ✅ xterm.js + node-pty |
| Session survives window close (lives in menu bar) | ✅ macOS-style |

### Keyboard shortcuts
| Shortcut | Action |
| --- | --- |
| `⌘K` | Command palette |
| `⌘T` | New Claude session |
| `⌘⇧T` | New Codex session |
| `⌘D` | New shell (split) |
| `⌘F` | Find in active terminal |
| `⌘⇧Z` | Zoom / unzoom pane |
| `⌘B` | Toggle broadcast mode |
| `⌘W` | Close active pane (keeps the session alive) |

---

## Requirements
- **macOS** (this build targets macOS first — menu-bar icon + native notifications).
- **Node 18+**.
- The CLIs on your `PATH`: [`claude`](https://docs.claude.com/en/docs/claude-code) and
  your `codex` binary. Missing a binary just means that session type won't spawn —
  the rest still works, and the **Shell** session type always works.

## Getting started
```bash
npm install      # also rebuilds node-pty against Electron (electron-builder install-app-deps)
npm run dev      # launch HituCode in development
```

Build a distributable:
```bash
npm run build            # bundle main + preload + renderer
npm run package          # produce a macOS .dmg (electron-builder)
```

> `npm install` runs `electron-builder install-app-deps` to rebuild the native
> `node-pty` module against Electron's ABI. If you install with `--ignore-scripts`,
> run `npx electron-builder install-app-deps` before `npm run dev`.

---

## Architecture

```
src/
  shared/           types + IPC channel names + CLI profiles (single source of truth)
  main/             Electron main process
    index.ts          app/window bootstrap, IPC wiring, notifications
    sessionManager.ts PTY lifecycle, broadcast fan-out, status counts (only state writer)
    statusEngine.ts   the green/red/yellow heuristic, one detector per session
    tray.ts           menu-bar radar icon + grouped session menu
  preload/          contextBridge -> window.keegu (typed, sandboxed IPC surface)
  renderer/         React + xterm.js UI
    terminalRegistry.ts  persistent xterm instances (scrollback survives moves)
    state/store.ts       zustand app state
    components/          TitleBar, Sidebar, Workspace, TerminalPane, CommandPalette, …
```

**Data flow:** a CLI's PTY output → `SessionManager` → `StatusDetector` (classifies) →
events fan out to the renderer (terminal + sidebar), the tray (counts), and
notifications (on red). The renderer is a pure view; the main process is the only
writer of session truth.

### Tuning status detection
Open [`src/shared/cliProfiles.ts`](src/shared/cliProfiles.ts) and add regexes to a
CLI's `waitingPatterns` (e.g. a specific approval prompt). Timing knobs
(`SETTLE_MS`, `DEEP_IDLE_MS`) live in
[`src/main/statusEngine.ts`](src/main/statusEngine.ts).

## Roadmap ideas
- Full recursive split trees (arbitrary tmux-style layouts) and saved workspaces.
- Per-CLI badges/profiles (iTerm2 profiles) and a hotkey drop-down window.
- Optional Monaco editor + file tree for a full Cursor-clone second phase.
