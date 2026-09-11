import {
  appendSample,
  applyChange,
  applyRecovered,
  applyStop,
  createLiveSession,
  currentSport,
  isLive,
  newId,
  nowMs,
  type Sample,
  type Session,
  type SessionEvent,
  type Sport,
} from "@bricklap/engine";
import { replaySessions, type EventRow, type SampleRow, type StoredSession } from "./replay";
import { migrate } from "./schema";
import type { SqlDb } from "./sql";

/**
 * Same verbs as the web-lab store (`apps/web-lab/src/lib/store.ts`): hydrate,
 * start, changeSport, stop, pushSample, discardLive, live, byId. What differs
 * is underneath — SQLite instead of localStorage, and nothing is ever deleted:
 * discardLive writes a STOP with a flag.
 */
export interface SessionStore {
  /** Open, migrate, replay. Marks a live session as recovered and returns it. */
  hydrate(at?: number): Session | null;
  start(sport: Sport, at?: number): string;
  changeSport(sport: Sport, at?: number): void;
  stop(at?: number): string | null;
  pushSample(sample: Sample): void;
  discardLive(at?: number): void;
  live(): Session | null;
  byId(id: string): Session | undefined;
  summaries(): SessionSummary[];
  /** Write buffered samples now. Returns how many rows went to disk. */
  flush(): number;
}

export type SessionSummary = {
  /** Events only; `samples` is always empty here. Enough for duration and segments. */
  session: Session;
  discarded: boolean;
  sampleCount: number;
};

export type WriteTiming = {
  kind: "event" | "batch";
  ms: number;
  /** Rows written in this transaction (an event write also flushes pending samples). */
  rows: number;
};

export type RepositoryOptions = {
  /**
   * How long a sample may wait in memory before the batch hits disk.
   * 0 writes each sample at once. Bounds the loss on a hard kill: at most
   * one interval of samples (plus the sample in flight) is lost, never an event.
   */
  flushIntervalMs?: number;
  now?: () => number;
  /** High-resolution clock for timings; defaults to performance.now(). */
  clock?: () => number;
  onTiming?: (timing: WriteTiming) => void;
};

export const DEFAULT_FLUSH_INTERVAL_MS = 2000;

const SELECT_EVENTS = "SELECT seq, session_id, type, at, sport, discarded FROM events";
const SELECT_SAMPLES = "SELECT session_id, t, lat, lng, speed_mps, source, accuracy FROM samples";

function defaultClock(): number {
  const p = (globalThis as { performance?: { now?: () => number } }).performance;
  return p?.now ? p.now() : Date.now();
}

export class SqliteSessionStore implements SessionStore {
  private readonly db: SqlDb;
  private readonly flushIntervalMs: number;
  private readonly now: () => number;
  private readonly clock: () => number;
  private readonly onTiming: ((t: WriteTiming) => void) | undefined;

  private liveSession: Session | null = null;
  private pending: { sessionId: string; sample: Sample }[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: SqlDb, options: RepositoryOptions = {}) {
    this.db = db;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.now = options.now ?? nowMs;
    this.clock = options.clock ?? defaultClock;
    this.onTiming = options.onTiming;
  }

  hydrate(at = this.now()): Session | null {
    migrate(this.db);
    const live = this.loadLive();
    if (!live) {
      this.liveSession = null;
      return null;
    }
    const recovered = applyRecovered(live, at);
    const added = recovered.events.length > live.events.length;
    if (added) this.writeEvent(recovered.id, recovered.events[recovered.events.length - 1]!, false);
    this.liveSession = recovered;
    return recovered;
  }

  live(): Session | null {
    return this.liveSession;
  }

  start(sport: Sport, at = this.now()): string {
    if (this.liveSession) return this.liveSession.id;
    const session = createLiveSession(sport, at, newId());
    this.writeEvent(session.id, session.events[0]!, false);
    this.liveSession = session;
    return session.id;
  }

  changeSport(sport: Sport, at = this.now()): void {
    const live = this.liveSession;
    if (!live) return;
    if (currentSport(live.events) === sport) return;
    const next = applyChange(live, sport, at);
    if (next === live) return;
    this.writeEvent(next.id, next.events[next.events.length - 1]!, false);
    this.liveSession = next;
  }

  stop(at = this.now()): string | null {
    return this.closeLive(at, false);
  }

  discardLive(at = this.now()): void {
    this.closeLive(at, true);
  }

  pushSample(sample: Sample): void {
    const live = this.liveSession;
    if (!live || !isLive(live)) return;
    this.liveSession = appendSample(live, sample);
    this.pending.push({ sessionId: live.id, sample });
    if (this.flushIntervalMs <= 0) {
      this.flush();
      return;
    }
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  flush(): number {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pending.length === 0) return 0;
    const batch = this.pending;
    this.pending = [];
    const t0 = this.clock();
    this.db.withTransactionSync(() => {
      for (const p of batch) this.insertSample(p.sessionId, p.sample);
    });
    this.onTiming?.({ kind: "batch", ms: this.clock() - t0, rows: batch.length });
    return batch.length;
  }

  byId(id: string): Session | undefined {
    const events = this.db.getAllSync<EventRow>(`${SELECT_EVENTS} WHERE session_id = ? ORDER BY seq`, [id]);
    if (events.length === 0) return undefined;
    const samples = this.db.getAllSync<SampleRow>(`${SELECT_SAMPLES} WHERE session_id = ? ORDER BY seq`, [id]);
    return replaySessions(events, samples)[0]?.session;
  }

  summaries(): SessionSummary[] {
    const events = this.db.getAllSync<EventRow>(`${SELECT_EVENTS} ORDER BY seq`, []);
    const counts = this.db.getAllSync<{ session_id: string; n: number }>(
      "SELECT session_id, COUNT(*) AS n FROM samples GROUP BY session_id",
      [],
    );
    const countById = new Map(counts.map((c) => [c.session_id, c.n]));
    return replaySessions(events, []).map((s) => ({
      session: s.session,
      discarded: s.discarded,
      sampleCount: countById.get(s.session.id) ?? 0,
    }));
  }

  /** Full replay of everything on disk. The recovery test compares against this. */
  loadAll(): StoredSession[] {
    const events = this.db.getAllSync<EventRow>(`${SELECT_EVENTS} ORDER BY seq`, []);
    const samples = this.db.getAllSync<SampleRow>(`${SELECT_SAMPLES} ORDER BY seq`, []);
    return replaySessions(events, samples);
  }

  // -- internals -----------------------------------------------------------

  private loadLive(): Session | null {
    // Events are few; replay them all, then fetch samples for the live one only.
    const events = this.db.getAllSync<EventRow>(`${SELECT_EVENTS} ORDER BY seq`, []);
    const live = replaySessions(events, []).filter((s) => isLive(s.session));
    // More than one live session cannot be written by this adapter; if it ever
    // shows up on disk, the newest is the one the athlete was recording.
    const chosen = live[live.length - 1];
    if (!chosen) return null;
    const samples = this.db.getAllSync<SampleRow>(`${SELECT_SAMPLES} WHERE session_id = ? ORDER BY seq`, [
      chosen.session.id,
    ]);
    return replaySessions(events.filter((e) => e.session_id === chosen.session.id), samples)[0]!.session;
  }

  private closeLive(at: number, discarded: boolean): string | null {
    const live = this.liveSession;
    if (!live) return null;
    const next = applyStop(live, at);
    if (next.events.length > live.events.length) {
      this.writeEvent(next.id, next.events[next.events.length - 1]!, discarded);
    }
    this.liveSession = null;
    return next.id;
  }

  /**
   * Synchronous, one transaction: pending samples first (so a boundary sample
   * lands before the CHANGE/STOP that follows it), then the event. When this
   * returns, the event is on disk.
   */
  private writeEvent(sessionId: string, event: SessionEvent, discarded: boolean): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const batch = this.pending;
    this.pending = [];
    const t0 = this.clock();
    this.db.withTransactionSync(() => {
      for (const p of batch) this.insertSample(p.sessionId, p.sample);
      const sport = event.type === "started" || event.type === "sport_changed" ? event.sport : null;
      this.db.runSync("INSERT INTO events (session_id, type, at, sport, discarded) VALUES (?, ?, ?, ?, ?)", [
        sessionId,
        event.type,
        event.at,
        sport,
        discarded ? 1 : 0,
      ]);
    });
    this.onTiming?.({ kind: "event", ms: this.clock() - t0, rows: batch.length + 1 });
  }

  private insertSample(sessionId: string, s: Sample): void {
    this.db.runSync(
      "INSERT INTO samples (session_id, t, lat, lng, speed_mps, source, accuracy) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sessionId, s.t, s.lat, s.lng, s.speedMps, s.source, s.accuracyM ?? null],
    );
  }
}
