import {
  SIM_SPEED_MPS,
  type Sample,
  type Segment,
  type SegmentMetrics,
  type Session,
  type SessionEvent,
  type Sport,
} from "./types";

const EARTH_M = 6_371_000;

/** Legs faster than this are GPS teleports and are ignored by distanceMeters. */
export const MAX_PLAUSIBLE_SPEED_MPS = 55;

/** Two 'recovered' events closer than this are collapsed into one. */
export const RECOVERED_DEDUPE_MS = 2000;

export function nowMs() {
  return Date.now();
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function destination(
  lat: number,
  lng: number,
  headingRad: number,
  meters: number,
) {
  const d = meters / EARTH_M;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(headingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

export function segmentsFromEvents(events: SessionEvent[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const event of events) {
    if (event.type === "started") {
      current = {
        index: 0,
        sport: event.sport,
        startAt: event.at,
        endAt: null,
        sampleStart: event.at,
        sampleEnd: event.at,
      };
      segments.push(current);
    } else if (event.type === "sport_changed" && current) {
      current.endAt = event.at;
      current.sampleEnd = event.at;
      current = {
        index: segments.length,
        sport: event.sport,
        startAt: event.at,
        endAt: null,
        sampleStart: event.at,
        sampleEnd: event.at,
      };
      segments.push(current);
    } else if (event.type === "stopped" && current) {
      current.endAt = event.at;
      current.sampleEnd = event.at;
    }
  }

  return segments;
}

export function currentSport(events: SessionEvent[]): Sport | null {
  const segs = segmentsFromEvents(events);
  if (segs.length === 0) return null;
  return segs[segs.length - 1]!.sport;
}

/** Time of the last 'stopped' event, if any. The last one wins, like in segmentsFromEvents. */
function lastStoppedAt(events: SessionEvent[]): number | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.type === "stopped") return e.at;
  }
  return undefined;
}

/**
 * A session is live only while its status says so AND no 'stopped' event
 * exists. Events are the source of truth, so a stale status never reopens a
 * session that already recorded its stop.
 */
export function isLive(session: Session): boolean {
  return session.status === "live" && lastStoppedAt(session.events) === undefined;
}

export function sessionBounds(session: Session): { start: number; end: number } {
  const start = session.events.find((e) => e.type === "started")?.at ?? session.createdAt;
  const stopped = lastStoppedAt(session.events);
  const lastSample = session.samples.at(-1)?.t;
  const end = stopped ?? lastSample ?? start;
  return { start, end };
}

export function durationMs(session: Session, at = nowMs()) {
  const { start, end } = sessionBounds(session);
  if (isLive(session)) return Math.max(0, at - start);
  return Math.max(0, end - start);
}

/** Plain filter: samples with start <= t <= end. No interpolation. */
export function samplesInRange(samples: Sample[], start: number, end: number) {
  return samples.filter((s) => s.t >= start && s.t <= end);
}

/**
 * Sample synthesised at time `t` by linear interpolation between the last
 * sample before `t` and the first one after it. Null when `t` is outside the
 * recorded span or when a real sample already sits exactly at `t`. Assumes
 * chronological samples.
 */
export function interpolateAt(samples: Sample[], t: number): Sample | null {
  let before: Sample | null = null;
  let after: Sample | null = null;
  for (const s of samples) {
    if (s.t < t) {
      before = s;
    } else if (s.t > t) {
      after = s;
      break;
    } else {
      return null;
    }
  }
  if (!before || !after) return null;
  const f = (t - before.t) / (after.t - before.t);
  return {
    t,
    lat: before.lat + (after.lat - before.lat) * f,
    lng: before.lng + (after.lng - before.lng) * f,
    speedMps: before.speedMps + (after.speedMps - before.speedMps) * f,
    source: before.source,
  };
}

/**
 * Samples that belong to the window [start, end]. Both bounds are inclusive,
 * and when no real sample sits exactly on a bound but samples exist on both
 * sides of it, a sample is interpolated there. So a leg that straddles a
 * sport change is split between the two segments instead of being lost, and
 * the segment distances add up to the session distance whatever the sampling
 * cadence.
 */
export function samplesBetween(samples: Sample[], start: number, end: number): Sample[] {
  if (end < start) return [];
  const inside = samplesInRange(samples, start, end);
  const head = inside[0]?.t === start ? null : interpolateAt(samples, start);
  const tail = start === end || inside.at(-1)?.t === end ? null : interpolateAt(samples, end);
  const out = inside.slice();
  if (head) out.unshift(head);
  if (tail) out.push(tail);
  return out;
}

export function distanceMeters(samples: Sample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const d = haversineMeters(a, b);
    const dt = Math.max(0.001, (b.t - a.t) / 1000);
    if (d / dt > MAX_PLAUSIBLE_SPEED_MPS) continue;
    total += d;
  }
  return total;
}

function segmentEnd(session: Session, segment: Segment, at: number): number {
  return segment.endAt ?? (isLive(session) ? at : sessionBounds(session).end);
}

/** Samples of a segment (see samplesBetween for the boundary rules). */
export function samplesForSegment(session: Session, segment: Segment, at = nowMs()): Sample[] {
  return samplesBetween(session.samples, segment.startAt, segmentEnd(session, segment, at));
}

export function metricsFor(
  samples: Sample[],
  startAt: number,
  endAt: number,
): SegmentMetrics {
  const slice = samplesBetween(samples, startAt, endAt);
  const durationMs = Math.max(0, endAt - startAt);
  const distanceM = distanceMeters(slice);
  const avgSpeedMps = durationMs > 0 ? distanceM / (durationMs / 1000) : 0;
  return { durationMs, distanceM, avgSpeedMps };
}

export function sessionMetrics(session: Session, at = nowMs()) {
  const { start, end } = sessionBounds(session);
  return metricsFor(session.samples, start, isLive(session) ? at : end);
}

export function segmentMetrics(session: Session, segment: Segment, at = nowMs()) {
  return metricsFor(session.samples, segment.startAt, segmentEnd(session, segment, at));
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatDistance(meters: number) {
  const rounded = Math.round(meters);
  if (rounded < 1000) return `${rounded} m`;
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
}

export function formatPace(meters: number, durationMs: number) {
  if (meters < 20) return "—";
  const secPerKm = durationMs / 1000 / (meters / 1000);
  if (!Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return "—";
  // Round the total first so 299.6 s reads 5:00, never 4:60.
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function formatSpeedKmh(mps: number) {
  if (!Number.isFinite(mps) || mps <= 0.2) return "—";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatClock(ts: number, locale?: string) {
  return new Date(ts).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(ts: number, locale?: string) {
  return new Date(ts).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function createLiveSession(sport: Sport, at = nowMs(), id = newId()): Session {
  return {
    id,
    createdAt: at,
    status: "live",
    events: [{ type: "started", at, sport }],
    samples: [],
  };
}

export function applyChange(session: Session, sport: Sport, at = nowMs()): Session {
  if (!isLive(session)) return session;
  const current = currentSport(session.events);
  // No open segment (no 'started' yet) or same sport: nothing to record.
  if (current === null || current === sport) return session;
  return {
    ...session,
    events: [...session.events, { type: "sport_changed", at, sport }],
  };
}

export function applyStop(session: Session, at = nowMs()): Session {
  if (session.status !== "live") return session;
  // A 'stopped' event already recorded: only the stale status needs fixing.
  if (lastStoppedAt(session.events) !== undefined) return { ...session, status: "stopped" };
  return {
    ...session,
    status: "stopped",
    events: [...session.events, { type: "stopped", at }],
  };
}

export function applyRecovered(session: Session, at = nowMs()): Session {
  if (!isLive(session)) return session;
  const last = session.events.at(-1);
  if (last?.type === "recovered" && at - last.at < RECOVERED_DEDUPE_MS) return session;
  return {
    ...session,
    events: [...session.events, { type: "recovered", at }],
  };
}

/**
 * Mark every live session as recovered (app restarted, tab reopened). Stopped
 * sessions are returned untouched. Used by persistence adapters on hydrate.
 */
export function recoverLiveSessions(sessions: Session[], at = nowMs()): Session[] {
  return sessions.map((s) => (isLive(s) ? applyRecovered(s, at) : s));
}

export function appendSample(session: Session, sample: Sample): Session {
  if (!isLive(session)) return session;
  return { ...session, samples: [...session.samples, sample] };
}

export function typicalSpeed(sport: Sport) {
  return SIM_SPEED_MPS[sport];
}
