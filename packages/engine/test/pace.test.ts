import { describe, expect, it } from "vitest";
import fieldLegs from "./fixtures/field-legs.json";
import {
  RECENT_WINDOW_MS,
  destination,
  distanceMeters,
  formatPace,
  interpolateAt,
  LISBON,
  recentMetrics,
  sampleFromGps,
  samplesBetween,
  segmentMetrics,
  segmentsFromEvents,
  type Sample,
  type Session,
} from "../src";
import { makeSession, sampleAt, track } from "./helpers";

/**
 * Real legs from the founder's field sessions, anonymised to
 * [dtMs, distanceM, accuracyM] (see fixtures/field-legs.json). Laid along a
 * straight line from Lisbon: the engine only ever looks at distances between
 * consecutive fixes, so the shape of the track is irrelevant to what is
 * asserted here, and no coordinate of the founder's is needed.
 */
type Excerpt = { firstAccuracyM: number | null; legs: [number, number, number | null][] };
const FIXTURE = fieldLegs as unknown as { walkWithStop: Excerpt; steadyRun: Excerpt };

function fromLegs(excerpt: Excerpt, startAt = 0): Sample[] {
  const out: Sample[] = [];
  let t = startAt;
  let meters = 0;
  const push = (accuracy: number | null) => {
    const p = destination(LISBON.lat, LISBON.lng, 0.3, meters);
    out.push({ t, lat: p.lat, lng: p.lng, speedMps: 0, source: "gps", ...(accuracy === null ? {} : { accuracyM: accuracy }) });
  };
  push(excerpt.firstAccuracyM);
  for (const [dtMs, dM, acc] of excerpt.legs) {
    t += dtMs;
    meters += dM;
    push(acc);
  }
  return out;
}

const sumLegs = (e: Excerpt) => e.legs.reduce((a, [, d]) => a + d, 0);
const spanMs = (e: Excerpt) => e.legs.reduce((a, [dt]) => a + dt, 0);

function liveSession(samples: Sample[], sport: "walk" | "run"): Session {
  return makeSession([{ type: "started", at: samples[0]!.t, sport }], samples, "live");
}

describe("field excerpts reconstruct faithfully", () => {
  it("walk excerpt: 89 legs over 89 s, about 92 m, with a stop in the middle", () => {
    const e = FIXTURE.walkWithStop;
    expect(e.legs).toHaveLength(89);
    expect(spanMs(e)).toBe(88_999);
    expect(sumLegs(e)).toBeCloseTo(91.9, 0);
    expect(distanceMeters(fromLegs(e))).toBeCloseTo(sumLegs(e), 2);
    // The stop: consecutive legs shorter than half a metre, ~30 s to ~64 s in.
    let at = 0;
    const still: number[] = [];
    for (const [dt, d] of e.legs) {
      at += dt;
      if (d < 0.5) still.push(at);
    }
    expect(still.length).toBeGreaterThanOrEqual(30);
    expect(Math.min(...still)).toBeGreaterThan(29_000);
    expect(Math.max(...still)).toBeLessThan(65_000);
  });

  it("run excerpt: about 156 m in 59 s, no leg under 1.5 m", () => {
    const e = FIXTURE.steadyRun;
    expect(spanMs(e)).toBe(59_002);
    expect(sumLegs(e)).toBeCloseTo(155.9, 0);
    expect(e.legs.every(([, d]) => d >= 1.5)).toBe(true);
    expect(distanceMeters(fromLegs(e))).toBeCloseTo(sumLegs(e), 2);
  });

  it("every fix in both excerpts reported an accuracy between 2 and 10 m", () => {
    for (const e of [FIXTURE.walkWithStop, FIXTURE.steadyRun]) {
      const accs = [e.firstAccuracyM, ...e.legs.map(([, , a]) => a)];
      expect(accs.every((a) => a !== null && a >= 2 && a <= 10)).toBe(true);
    }
  });
});

describe("recentMetrics — o ritmo do momento, sobre os excertos reais", () => {
  const walk = liveSession(fromLegs(FIXTURE.walkWithStop), "walk");
  const [walkSeg] = segmentsFromEvents(walk.events);
  const walkEnd = walk.samples.at(-1)!.t;

  it("the segment average dilutes a 34 s stop into a pace the athlete never walked at", () => {
    const avg = segmentMetrics(walk, walkSeg!, walkEnd);
    // ~92 m in 89 s: slower than 15:00/km, yet the founder walks at 11–13/km.
    expect(avg.avgSpeedMps).toBeLessThan(1000 / (15 * 60));
    expect(formatPace(avg.distanceM, avg.durationMs)).toMatch(/^1[5-7]:\d\d\/km$/);
  });

  it("before the stop, the recent pace is the walking pace (between 11:00 and 13:30/km)", () => {
    const m = recentMetrics(walk, walkSeg!, walkSeg!.startAt + RECENT_WINDOW_MS);
    expect(m.durationMs).toBe(RECENT_WINDOW_MS);
    const secPerKm = 1000 / m.avgSpeedMps;
    expect(secPerKm).toBeGreaterThan(11 * 60);
    expect(secPerKm).toBeLessThan(13.5 * 60);
  });

  it("at the end of the stop, the recent window covers under 20 m and the formatter says —", () => {
    const m = recentMetrics(walk, walkSeg!, walkSeg!.startAt + 64_000);
    expect(m.durationMs).toBe(RECENT_WINDOW_MS);
    expect(m.distanceM).toBeLessThan(20);
    expect(formatPace(m.distanceM, m.durationMs)).toBe("—");
  });

  it("once walking resumes the recent pace recovers while the average is still stuck", () => {
    const recent = recentMetrics(walk, walkSeg!, walkEnd);
    const avg = segmentMetrics(walk, walkSeg!, walkEnd);
    // 25 s of walking + 5 s of stop in the window: faster than the average, slower than pure walking.
    expect(recent.avgSpeedMps).toBeGreaterThan(avg.avgSpeedMps);
    expect(recent.avgSpeedMps).toBeLessThan(1.6);
  });

  it("steady running: the recent pace and the segment average agree within 10 %", () => {
    const run = liveSession(fromLegs(FIXTURE.steadyRun, 1_000_000), "run");
    const [seg] = segmentsFromEvents(run.events);
    const end = run.samples.at(-1)!.t;
    const avg = segmentMetrics(run, seg!, end);
    for (let at = seg!.startAt + RECENT_WINDOW_MS; at <= end; at += 5_000) {
      const recent = recentMetrics(run, seg!, at);
      expect(recent.durationMs).toBe(RECENT_WINDOW_MS);
      expect(Math.abs(recent.avgSpeedMps - avg.avgSpeedMps) / avg.avgSpeedMps).toBeLessThan(0.1);
      // Never "—" while running: every 30 s window holds far more than 20 m.
      expect(recent.distanceM).toBeGreaterThan(60);
    }
  });
});

describe("recentMetrics — janela, fronteiras e casos degenerados", () => {
  // run 0–10 s, bike 10–20 s, stopped at 20 s; a sample every 5 s, 10 m apart (2 m/s).
  const EVENTS = [
    { type: "started", at: 0, sport: "run" },
    { type: "sport_changed", at: 10_000, sport: "bike" },
    { type: "stopped", at: 20_000 },
  ] as const;
  const SAMPLES = track(0, 20_000, 5_000, 10);
  const STOPPED = makeSession([...EVENTS], SAMPLES);

  it("is clipped to the segment start right after a START or CHANGE", () => {
    const [run, bike] = segmentsFromEvents(STOPPED.events);
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [open] = segmentsFromEvents(live.events);
    expect(recentMetrics(live, open!, 7_500)).toEqual({ durationMs: 7_500, distanceM: expect.closeTo(15, 3), avgSpeedMps: expect.closeTo(2, 3) });
    // Closed segments end at their own end, whatever `at` says; the bike
    // segment is only 10 s long, so the window is 10 s.
    expect(recentMetrics(STOPPED, bike!, 999_999)).toEqual({ durationMs: 10_000, distanceM: expect.closeTo(20, 3), avgSpeedMps: expect.closeTo(2, 3) });
    expect(recentMetrics(STOPPED, run!, 999_999).durationMs).toBe(10_000);
  });

  it("uses the given window, interpolating at its bounds like any segment window", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(live.events);
    const m = recentMetrics(live, seg!, 17_500, 5_000);
    expect(m.durationMs).toBe(5_000);
    expect(m.distanceM).toBeCloseTo(10, 3);
  });

  it("defaults `at` to now, so a stopped session needs no clock", () => {
    const [bike] = segmentsFromEvents(STOPPED.events).slice(1);
    expect(recentMetrics(STOPPED, bike!)).toEqual(recentMetrics(STOPPED, bike!, 0));
  });

  it("a segment without GPS has a window but no distance or speed", () => {
    const gym = makeSession([{ type: "started", at: 0, sport: "strength" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(gym.events);
    expect(recentMetrics(gym, seg!, 45_000)).toEqual({ durationMs: RECENT_WINDOW_MS, distanceM: 0, avgSpeedMps: 0 });
    expect(recentMetrics(gym, seg!, 5_000)).toEqual({ durationMs: 5_000, distanceM: 0, avgSpeedMps: 0 });
  });

  it("never borrows a fix from across a segment without GPS (the fence of ADR 0008)", () => {
    // Strength 0–60 s with stray fixes, then run from 60 s. Five seconds into
    // the run only the run's own fixes count: the window is 5 s and it does
    // not interpolate back towards the gym's last fix.
    const mixed = makeSession(
      [
        { type: "started", at: 0, sport: "strength" },
        { type: "sport_changed", at: 60_000, sport: "run" },
      ],
      [sampleAt(0, 0), sampleAt(59_000, 500), sampleAt(61_000, 1_000), sampleAt(65_000, 1_012)],
      "live",
    );
    const [, run] = segmentsFromEvents(mixed.events);
    const m = recentMetrics(mixed, run!, 65_000);
    expect(m.durationMs).toBe(5_000);
    expect(m.distanceM).toBeCloseTo(12, 3);
  });

  it("zero-length window reports zero speed, never NaN", () => {
    const zero = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(zero.events);
    expect(recentMetrics(zero, seg!, 0)).toEqual({ durationMs: 0, distanceM: 0, avgSpeedMps: 0 });
  });

  it("exposes the window as RECENT_WINDOW_MS = 30 s", () => {
    expect(RECENT_WINDOW_MS).toBe(30_000);
  });
});

describe("accuracyM — a precisão viaja com a amostra (ADR 0009)", () => {
  it("sampleFromGps keeps a finite, non-negative accuracy and drops anything else", () => {
    const base = { latitude: 1, longitude: 2, speed: 3 };
    expect(sampleFromGps({ ...base, accuracy: 4.5 }, 7)).toEqual({ t: 7, lat: 1, lng: 2, speedMps: 3, source: "gps", accuracyM: 4.5 });
    expect(sampleFromGps({ ...base, accuracy: 0 }, 7).accuracyM).toBe(0);
    for (const accuracy of [null, undefined, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const s = sampleFromGps({ ...base, accuracy }, 7);
      expect("accuracyM" in s).toBe(false);
    }
  });

  it("interpolateAt interpolates the accuracy when both neighbours have one, else omits it", () => {
    const a: Sample = { t: 0, lat: 10, lng: 20, speedMps: 2, source: "gps", accuracyM: 4 };
    const b: Sample = { t: 10_000, lat: 11, lng: 22, speedMps: 4, source: "gps", accuracyM: 8 };
    expect(interpolateAt([a, b], 2_500)?.accuracyM).toBe(5);
    const noAccLater: Sample = { t: 10_000, lat: 11, lng: 22, speedMps: 4, source: "gps" };
    const noAccEarlier: Sample = { t: 0, lat: 10, lng: 20, speedMps: 2, source: "gps" };
    expect("accuracyM" in interpolateAt([a, noAccLater], 2_500)!).toBe(false);
    expect("accuracyM" in interpolateAt([noAccEarlier, b], 5_000)!).toBe(false);
  });

  it("samplesBetween carries the accuracy through real and synthesised samples", () => {
    const samples = fromLegs(FIXTURE.steadyRun);
    const window = samplesBetween(samples, samples[0]!.t + 500, samples[0]!.t + 2_500);
    expect(window.every((s) => typeof s.accuracyM === "number")).toBe(true);
  });

  it("distance does not depend on the accuracy today: the same legs with or without it measure the same", () => {
    const withAcc = fromLegs(FIXTURE.walkWithStop);
    const without = withAcc.map(({ accuracyM: _drop, ...rest }) => rest);
    expect(distanceMeters(without)).toBeCloseTo(distanceMeters(withAcc), 9);
  });
});
