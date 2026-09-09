import { destination, LISBON, type Sample, type Session, type SessionEvent } from "../src";

/** Build a session from raw parts. Defaults keep tests short and explicit. */
export function makeSession(
  events: SessionEvent[],
  samples: Sample[] = [],
  status: Session["status"] = events.some((e) => e.type === "stopped") ? "stopped" : "live",
  id = "s-test",
): Session {
  const createdAt = events[0]?.at ?? 0;
  return { id, createdAt, status, events, samples };
}

/** A sample at time `t`, `meters` metres from Lisbon along a fixed heading. */
export function sampleAt(t: number, meters: number, speedMps = 3): Sample {
  const p = destination(LISBON.lat, LISBON.lng, 0.3, meters);
  return { t, lat: p.lat, lng: p.lng, speedMps, source: "sim" };
}

/**
 * A straight track: one sample every `stepMs` from `startAt` to `endAt`
 * (inclusive), advancing `metersPerStep` each step.
 */
export function track(startAt: number, endAt: number, stepMs: number, metersPerStep: number): Sample[] {
  const out: Sample[] = [];
  let meters = 0;
  for (let t = startAt; t <= endAt; t += stepMs) {
    out.push(sampleAt(t, meters));
    meters += metersPerStep;
  }
  return out;
}
