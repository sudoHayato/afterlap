import { create } from "zustand";
import {
  applyChange,
  applyStop,
  appendSample,
  createLiveSession,
  currentSport,
  recoverLiveSessions,
  seedSessions,
  type Sample,
  type Session,
  type Sport,
} from "@bricklap/engine";

/** localStorage key for the lab's sessions. Also quoted by the legal pages. */
export const STORAGE_KEY = "bricklap.v1";
/** Key used before the rename. Adopted once, then removed. */
const LEGACY_STORAGE_KEY = "afterlap.v1";

type PersistShape = {
  sessions: Session[];
  seeded: boolean;
};

function parse(raw: string | null): PersistShape | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistShape | null;
    if (!parsed || !Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read the persisted state. When nothing is stored under STORAGE_KEY but a
 * valid payload exists under the legacy key, adopt it: copy it to STORAGE_KEY
 * and drop the legacy key. Never throws — any failure just means "nothing".
 */
function load(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const current = storage.getItem(STORAGE_KEY);
    if (current !== null) return parse(current);

    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    const migrated = parse(legacy);
    if (!migrated || legacy === null) return null;
    storage.setItem(STORAGE_KEY, legacy);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  } catch {
    return null;
  }
}

function save(state: PersistShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: the in-memory state still wins.
  }
}

export type BricklapState = {
  ready: boolean;
  sessions: Session[];
  seeded: boolean;
  hydrate: () => void;
  start: (sport: Sport) => string;
  changeSport: (sport: Sport) => void;
  stop: () => string | null;
  pushSample: (sample: Sample) => void;
  discardLive: () => void;
  deleteSession: (id: string) => void;
  live: () => Session | null;
  byId: (id: string) => Session | undefined;
};

export const useBricklap = create<BricklapState>((set, get) => ({
  ready: true,
  sessions: seedSessions(),
  seeded: true,

  hydrate: () => {
    const loaded = load();
    if (!loaded) {
      const sessions = seedSessions();
      save({ sessions, seeded: true });
      set({ sessions, seeded: true, ready: true });
      return;
    }
    const sessions = recoverLiveSessions(loaded.sessions);
    save({ sessions, seeded: loaded.seeded });
    set({ ready: true, sessions, seeded: loaded.seeded });
  },

  live: () => get().sessions.find((s) => s.status === "live") ?? null,

  byId: (id) => get().sessions.find((s) => s.id === id),

  start: (sport) => {
    const existing = get().live();
    if (existing) return existing.id;
    const session = createLiveSession(sport);
    const sessions = [session, ...get().sessions];
    save({ sessions, seeded: get().seeded });
    set({ sessions });
    return session.id;
  },

  changeSport: (sport) => {
    const live = get().live();
    if (!live) return;
    if (currentSport(live.events) === sport) return;
    const next = applyChange(live, sport);
    const sessions = get().sessions.map((s) => (s.id === next.id ? next : s));
    save({ sessions, seeded: get().seeded });
    set({ sessions });
  },

  stop: () => {
    const live = get().live();
    if (!live) return null;
    const next = applyStop(live);
    const sessions = get().sessions.map((s) => (s.id === next.id ? next : s));
    save({ sessions, seeded: get().seeded });
    set({ sessions });
    return next.id;
  },

  pushSample: (sample) => {
    const live = get().live();
    if (!live) return;
    const next = appendSample(live, sample);
    const sessions = get().sessions.map((s) => (s.id === next.id ? next : s));
    save({ sessions, seeded: get().seeded });
    set({ sessions });
  },

  discardLive: () => {
    const live = get().live();
    if (!live) return;
    const sessions = get().sessions.filter((s) => s.id !== live.id);
    save({ sessions, seeded: get().seeded });
    set({ sessions });
  },

  deleteSession: (id) => {
    const sessions = get().sessions.filter((s) => s.id !== id);
    save({ sessions, seeded: get().seeded });
    set({ sessions });
  },
}));
