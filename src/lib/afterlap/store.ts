import { create } from "zustand";
import {
  applyChange,
  applyRecovered,
  applyStop,
  appendSample,
  createLiveSession,
  currentSport,
} from "./engine";
import { seedSessions } from "./seed";
import type { Sample, Session, Sport } from "./types";

const KEY = "afterlap.v1";

type PersistShape = {
  sessions: Session[];
  seeded: boolean;
};

function load(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistShape;
    if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(state: PersistShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

type AfterlapState = {
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

export const useAfterlap = create<AfterlapState>((set, get) => ({
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
    const sessions = loaded.sessions.map((s) =>
      s.status === "live" ? applyRecovered(s) : s,
    );
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
