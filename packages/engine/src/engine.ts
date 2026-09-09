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

export function sessionBounds(session: Session): { start: number; end: number } {
  const start = session.events.find((e) => e.type === "started")?.at ?? session.createdAt;
  const stopped = session.events.find((e) => e.type === "stopped")?.at;
  const lastSample = session.samples.at(-1)?.t;
  const end = stopped ?? lastSample ?? start;
  return { start, end };
}

export function durationMs(session: Session, at = nowMs()) {
  const { start, end } = sessionBounds(session);
  if (session.status === "live") return Math.max(0, at - start);
  return Math.max(0, end - start);
}

export function samplesInRange(samples: Sample[], start: number, end: number) {
  return samples.filter((s) => s.t >= start && s.t <= end);
}

export function distanceMeters(samples: Sample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const d = haversineMeters(a, b);
    const dt = Math.max(0.001, (b.t - a.t) / 1000);
    if (d / dt > 55) continue;
    total += d;
  }
  return total;
}

export function metricsFor(
  samples: Sample[],
  startAt: number,
  endAt: number,
): SegmentMetrics {
  const slice = samplesInRange(samples, startAt, endAt);
  const durationMs = Math.max(0, endAt - startAt);
  const distanceM = distanceMeters(slice);
  const avgSpeedMps = durationMs > 0 ? distanceM / (durationMs / 1000) : 0;
  return { durationMs, distanceM, avgSpeedMps };
}

export function sessionMetrics(session: Session, at = nowMs()) {
  const { start } = sessionBounds(session);
  const end = session.status === "live" ? at : sessionBounds(session).end;
  return metricsFor(session.samples, start, end);
}

export function segmentMetrics(session: Session, segment: Segment, at = nowMs()) {
  const end = segment.endAt ?? (session.status === "live" ? at : sessionBounds(session).end);
  return metricsFor(session.samples, segment.startAt, end);
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
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
}

export function formatPace(meters: number, durationMs: number) {
  if (meters < 20) return "—";
  const secPerKm = durationMs / 1000 / (meters / 1000);
  if (!Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function formatSpeedKmh(mps: number) {
  if (!Number.isFinite(mps) || mps <= 0.2) return "—";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function createLiveSession(sport: Sport, at = nowMs()): Session {
  return {
    id: newId(),
    createdAt: at,
    status: "live",
    events: [{ type: "started", at, sport }],
    samples: [],
  };
}

export function applyChange(session: Session, sport: Sport, at = nowMs()): Session {
  if (session.status !== "live") return session;
  const current = currentSport(session.events);
  if (current === sport) return session;
  return {
    ...session,
    events: [...session.events, { type: "sport_changed", at, sport }],
  };
}

export function applyStop(session: Session, at = nowMs()): Session {
  if (session.status !== "live") return session;
  return {
    ...session,
    status: "stopped",
    events: [...session.events, { type: "stopped", at }],
  };
}

export function applyRecovered(session: Session, at = nowMs()): Session {
  if (session.status !== "live") return session;
  const last = session.events.at(-1);
  if (last?.type === "recovered" && at - last.at < 2000) return session;
  return {
    ...session,
    events: [...session.events, { type: "recovered", at }],
  };
}

export function appendSample(session: Session, sample: Sample): Session {
  if (session.status !== "live") return session;
  return { ...session, samples: [...session.samples, sample] };
}

export function typicalSpeed(sport: Sport) {
  return SIM_SPEED_MPS[sport];
}
