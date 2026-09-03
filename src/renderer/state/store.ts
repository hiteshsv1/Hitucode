import { create } from 'zustand'
import type {
  SessionMeta,
  StatusCounts,
  CliProfile,
  CliKind,
  SessionStatus
} from '@shared/types'
import { terminals } from '../terminalRegistry'

const MAX_PANES = 4
const PIN_KEY = 'keegu.sidebar.pinned'

function readPinned(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) !== '0'
  } catch {
    return true
  }
}

interface State {
  profiles: CliProfile[]
  sessions: Record<string, SessionMeta>
  counts: StatusCounts
  activeId: string | null
  visiblePanes: string[]
  zoomed: boolean

  sidebarPinned: boolean
  sidebarHover: boolean
  broadcastMode: boolean
  paletteOpen: boolean
  searchOpen: boolean

  bootstrap: () => Promise<void>
  newSession: (kind: CliKind, cwd?: string) => Promise<void>
  upsertMeta: (meta: SessionMeta) => void
  removeSession: (id: string) => void
  setCounts: (c: StatusCounts) => void

  focus: (id: string) => void
  showOnly: (id: string) => void
  splitWith: (id: string) => void
  closePane: (id: string) => void
  toggleZoom: () => void

  togglePin: () => void
  setHover: (v: boolean) => void
  toggleBroadcastMode: () => void
  toggleSessionBroadcast: (id: string) => void
  cycleStatusOverride: (id: string) => void
  rename: (id: string, title: string) => void

  setPalette: (v: boolean) => void
  setSearch: (v: boolean) => void
}

export const useStore = create<State>((set, get) => ({
  profiles: [],
  sessions: {},
  counts: { green: 0, red: 0, yellow: 0, grey: 0 },
  activeId: null,
  visiblePanes: [],
  zoomed: false,

  sidebarPinned: readPinned(),
  sidebarHover: false,
  broadcastMode: false,
  paletteOpen: false,
  searchOpen: false,

  bootstrap: async () => {
    const [profiles, existing] = await Promise.all([
      window.keegu.listProfiles(),
      window.keegu.listSessions()
    ])
    const sessions: Record<string, SessionMeta> = {}
    for (const m of existing) sessions[m.id] = m
    set({ profiles, sessions })

    window.keegu.onData(({ id, data }) => terminals.write(id, data))
    window.keegu.onMeta((m) => get().upsertMeta(m))
    window.keegu.onClosed(({ id }) => {
      // Leave the terminal on screen so the user can read final output;
      // status flips to done/error via the meta event.
      void id
    })
    window.keegu.onCounts((c) => get().setCounts(c))
    window.keegu.onFocusSession((id) => get().focus(id))
  },

  newSession: async (kind, cwd) => {
    const meta = await window.keegu.createSession({ kind, cwd })
    get().upsertMeta(meta)
    get().showOnly(meta.id)
  },

  upsertMeta: (meta) =>
    set((s) => ({ sessions: { ...s.sessions, [meta.id]: meta } })),

  removeSession: (id) =>
    set((s) => {
      const sessions = { ...s.sessions }
      delete sessions[id]
      terminals.dispose(id)
      const visiblePanes = s.visiblePanes.filter((p) => p !== id)
      const activeId = s.activeId === id ? (visiblePanes[0] ?? null) : s.activeId
      return { sessions, visiblePanes, activeId }
    }),

  setCounts: (counts) => set({ counts }),

  focus: (id) =>
    set((s) => {
      const visiblePanes = s.visiblePanes.includes(id)
        ? s.visiblePanes
        : [id]
      queueMicrotask(() => terminals.focus(id))
      return { activeId: id, visiblePanes, zoomed: false }
    }),

  showOnly: (id) => {
    set({ visiblePanes: [id], activeId: id, zoomed: false })
    queueMicrotask(() => terminals.focus(id))
  },

  splitWith: (id) =>
    set((s) => {
      if (s.visiblePanes.includes(id)) return { activeId: id }
      const visiblePanes = [...s.visiblePanes, id].slice(-MAX_PANES)
      return { visiblePanes, activeId: id, zoomed: false }
    }),

  closePane: (id) =>
    set((s) => {
      const visiblePanes = s.visiblePanes.filter((p) => p !== id)
      const activeId = s.activeId === id ? (visiblePanes[0] ?? null) : s.activeId
      terminals.unmount(id)
      return { visiblePanes, activeId, zoomed: false }
    }),

  toggleZoom: () => set((s) => ({ zoomed: !s.zoomed && s.visiblePanes.length > 1 })),

  togglePin: () =>
    set((s) => {
      const sidebarPinned = !s.sidebarPinned
      try {
        localStorage.setItem(PIN_KEY, sidebarPinned ? '1' : '0')
      } catch {
        /* ignore */
      }
      return { sidebarPinned }
    }),

  setHover: (sidebarHover) => set({ sidebarHover }),

  toggleBroadcastMode: () => set((s) => ({ broadcastMode: !s.broadcastMode })),

  toggleSessionBroadcast: (id) => {
    const cur = get().sessions[id]
    if (!cur) return
    void window.keegu.setBroadcast(id, !cur.broadcast)
  },

  cycleStatusOverride: (id) => {
    const order: SessionStatus[] = ['running', 'waiting', 'done']
    const cur = get().sessions[id]?.status ?? 'idle'
    const next = order[(order.indexOf(cur as SessionStatus) + 1) % order.length]
    void window.keegu.setStatusOverride(id, next)
  },

  rename: (id, title) => void window.keegu.renameSession(id, title),

  setPalette: (paletteOpen) => set({ paletteOpen }),
  setSearch: (searchOpen) => set({ searchOpen })
}))

// Derived selectors ---------------------------------------------------------

export function sessionList(s: State): SessionMeta[] {
  return Object.values(s.sessions)
}
export function byRecency(s: State): SessionMeta[] {
  return sessionList(s).sort((a, b) => b.lastActivity - a.lastActivity)
}
export function isRed(m: SessionMeta): boolean {
  return m.status === 'waiting' || m.status === 'error'
}
