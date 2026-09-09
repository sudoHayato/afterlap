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
export const LEGACY_STORAGE_KEY = "afterlap.v1";

export type PersistShape = {
  sessions: Session[];
  /** True once the demo sessions were written. An empty list is then real data. */
  seeded: boolean;
};

/** The subset of the Web Storage API the store needs; injectable for tests. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parsePersisted(raw: string | null): PersistShape | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistShape> | null;
    if (!parsed || !Array.isArray(parsed.sessions)) return null;
    const seeded = parsed.seeded === true;
    // Before seeding, an empty list means "nothing stored yet"; after seeding it
    // means the athlete deleted every session, and the demo data must not return.
    if (parsed.sessions.length === 0 && !seeded) return null;
    return { sessions: parsed.sessions, seeded };
  } catch {
    return null;
  }
}

/**
 * Read the persisted state from `storage`.
 * - STORAGE_KEY valid → use it and drop any leftover legacy key.
 * - Otherwise, LEGACY_STORAGE_KEY valid → adopt it: copy to STORAGE_KEY, remove the legacy key.
 * - Otherwise null. Never throws.
 */
export function loadFrom(storage: StorageLike): PersistShape | null {
  try {
    const current = parsePersisted(storage.getItem(STORAGE_KEY));
    if (current) {
      storage.removeItem(LEGACY_STORAGE_KEY);
      return current;
    }
    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    const legacy = parsePersisted(legacyRaw);
    if (!legacy || legacyRaw === null) return null;
    storage.setItem(STORAGE_KEY, legacyRaw);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  } catch {
    return null;
  }
}

function load(): PersistShape | null {
  if (typeof window === "undefined") return null;
  return loadFrom(window.localStorage);
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
  /** False until hydrate() has read storage; routes that need a session wait for it. */
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
  ready: false,
  sessions: [],
  seeded: false,

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
