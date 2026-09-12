import { describe, expect, it } from "vitest";
import fieldLegs from "./fixtures/field-legs.json";
import fieldStill from "./fixtures/field-still.json";
import {
  ACCURACY_GATE_K,
  RECENT_WINDOW_MS,
  destination,
  distanceMeters,
  gateByAccuracy,
  LISBON,
  metricsFor,
  recentMetrics,
  segmentMetrics,
  segmentsFromEvents,
  sessionMetrics,
  type Sample,
} from "../src";
import { makeSession, sampleAt } from "./helpers";

/**
 * The accuracy gate (ADR 0009, revised in session 09): a fix counts only
 * once it has moved at least k × its own accuracy away from the last fix
 * that counted. Decided on the founder's 1 h field test, where 33 min of a
 * phone lying still cost 348 m of jitter. Three real excerpts here: the
 * still phone (a noise cloud, as offsets from its centroid), two minutes of
 * street walking from the same test, and the session 04/06 walk and run
 * excerpts the pace tests already use — the gate must leave those alone.
 */
type Legs = { firstAccuracyM: number | null; legs: [number, number, number | null][] };
type Cloud = { fixes: [number, number, number, number][] };
const LEGS = fieldLegs as unknown as { walkWithStop: Legs; steadyRun: Legs };
const STILL = fieldStill as unknown as { stillCloud: Cloud; fieldWalk: Legs };

/** Legs laid along a straight line, like pace.test.ts does. */
function fromLegs(excerpt: Legs, startAt = 0): Sample[] {
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

/** Offsets in metres around Lisbon: the cloud keeps its shape, so every pairwise distance survives. */
function fromCloud(cloud: Cloud, startAt = 0): Sample[] {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((LISBON.lat * Math.PI) / 180);
  let t = startAt;
  return cloud.fixes.map(([dtMs, x, y, acc]) => {
    t += dtMs;
    return { t, lat: LISBON.lat + y / mPerDegLat, lng: LISBON.lng + x / mPerDegLng, speedMps: 0, source: "gps", accuracyM: acc };
  });
}

const sumLegs = (e: Legs) => e.legs.reduce((a, [, d]) => a + d, 0);

describe("gateByAccuracy — a regra", () => {
  it("k is a quarter of the reported accuracy", () => {
    expect(ACCURACY_GATE_K).toBe(0.25);
  });

  it("keeps the first fix, then only fixes at least k × their accuracy from the last kept one", () => {
    // 4 m accuracy → 1 m threshold. Moves: 0.5, 0.6 (1.1 from the kept), 3, 0.2.
    const s = (t: number, m: number): Sample => ({ ...sampleAt(t, m), source: "gps", accuracyM: 4 });
    const kept = gateByAccuracy([s(0, 0), s(1_000, 0.5), s(2_000, 1.1), s(3_000, 4.1), s(4_000, 4.3)]);
    expect(kept.map((k) => k.t)).toEqual([0, 2_000, 3_000]);
  });

  it("a fix without accuracy always counts, and anchors the gate", () => {
    const a: Sample = { ...sampleAt(0, 0), source: "gps", accuracyM: 4 };
    const b: Sample = { ...sampleAt(1_000, 0.2), source: "sim" };
    const c: Sample = { ...sampleAt(2_000, 0.4), source: "gps", accuracyM: 4 };
    const d: Sample = { ...sampleAt(3_000, 1.3), source: "gps", accuracyM: 4 };
    expect(gateByAccuracy([a, b, c, d]).map((k) => k.t)).toEqual([0, 1_000, 3_000]);
  });

  it("k = 0 disables the gate; an empty list stays empty", () => {
    const samples = fromLegs(STILL.fieldWalk);
    expect(gateByAccuracy(samples, 0)).toBe(samples);
    expect(gateByAccuracy([])).toEqual([]);
  });

  it("simulated tracks (no accuracy) are untouched, so every earlier expectation holds", () => {
    const sim = [sampleAt(0, 0), sampleAt(1_000, 0.1), sampleAt(2_000, 0.2)];
    expect(gateByAccuracy(sim)).toEqual(sim);
  });
});

describe("gate — o telemóvel pousado numa mesa (3 min do teste de campo)", () => {
  const cloud = fromCloud(STILL.stillCloud);

  it("the excerpt is what it says: 180 fixes at 1 Hz, ~12 m accuracy, never more than 3 m from the centroid", () => {
    expect(cloud).toHaveLength(180);
    expect(cloud.at(-1)!.t - cloud[0]!.t).toBeCloseTo(179_000, -3);
    const accs = cloud.map((s) => s.accuracyM!);
    expect(Math.min(...accs)).toBeGreaterThan(8);
    expect(Math.max(...accs)).toBeLessThan(20);
    expect(Math.max(...STILL.stillCloud.fixes.map(([, x, y]) => Math.hypot(x, y)))).toBeLessThan(3);
  });

  it("the plain sum credits the still phone with ~27 m in 3 min; the gate credits it with none", () => {
    expect(distanceMeters(cloud)).toBeGreaterThan(25);
    expect(distanceMeters(cloud)).toBeLessThan(30);
    // 12 m accuracy → 3 m threshold, and no fix ever leaves the 3 m circle.
    expect(gateByAccuracy(cloud)).toHaveLength(1);
    const still = makeSession([{ type: "started", at: cloud[0]!.t, sport: "walk" }], cloud, "live");
    const [seg] = segmentsFromEvents(still.events);
    const end = cloud.at(-1)!.t;
    expect(segmentMetrics(still, seg!, end).distanceM).toBe(0);
    expect(sessionMetrics(still, end).distanceM).toBe(0);
    expect(recentMetrics(still, seg!, end).distanceM).toBe(0);
  });
});

describe("gate — a andar e a correr, a distância fica e o ritmo não piora", () => {
  it("2 min of street walking from the field test (4 m accuracy): distance within 1 %", () => {
    const samples = fromLegs(STILL.fieldWalk);
    const plain = sumLegs(STILL.fieldWalk);
    const gated = distanceMeters(gateByAccuracy(samples));
    expect(plain).toBeGreaterThan(150);
    expect(Math.abs(gated - plain) / plain).toBeLessThan(0.01);
    // Most fixes count: a walking leg (~1.3 m) beats a quarter of 4 m.
    expect(gateByAccuracy(samples).length).toBeGreaterThan(samples.length * 0.8);
  });

  it("session 06 run excerpt: not one fix gated, distance identical", () => {
    const samples = fromLegs(LEGS.steadyRun);
    expect(gateByAccuracy(samples)).toHaveLength(samples.length);
    expect(distanceMeters(gateByAccuracy(samples))).toBeCloseTo(distanceMeters(samples), 6);
  });

  it("steady running: the recent pace still agrees with the average within 10 % at every tick", () => {
    const run = makeSession([{ type: "started", at: 0, sport: "run" }], fromLegs(LEGS.steadyRun), "live");
    const [seg] = segmentsFromEvents(run.events);
    const end = run.samples.at(-1)!.t;
    const avg = segmentMetrics(run, seg!, end);
    for (let at = RECENT_WINDOW_MS; at <= end; at += 1_000) {
      const recent = recentMetrics(run, seg!, at);
      expect(Math.abs(recent.avgSpeedMps - avg.avgSpeedMps) / avg.avgSpeedMps).toBeLessThan(0.1);
    }
  });

  it("session 04 walk excerpt with a stop: only the stop's jitter goes, the walk stays within 2 %", () => {
    const samples = fromLegs(LEGS.walkWithStop);
    const plain = distanceMeters(samples);
    const gated = distanceMeters(gateByAccuracy(samples));
    expect(gated).toBeLessThanOrEqual(plain);
    expect((plain - gated) / plain).toBeLessThan(0.02);
    // During the stop the recent window still reads "—" territory: under 20 m.
    const walk = makeSession([{ type: "started", at: 0, sport: "walk" }], samples, "live");
    const [seg] = segmentsFromEvents(walk.events);
    expect(recentMetrics(walk, seg!, 64_000).distanceM).toBeLessThan(20);
  });

  it("metricsFor gates too, so a window over raw samples reads the same track", () => {
    const cloud = fromCloud(STILL.stillCloud, 10_000);
    expect(metricsFor(cloud, 10_000, cloud.at(-1)!.t).distanceM).toBe(0);
    const walk = fromLegs(STILL.fieldWalk);
    const whole = metricsFor(walk, walk[0]!.t, walk.at(-1)!.t).distanceM;
    expect(whole).toBeCloseTo(distanceMeters(gateByAccuracy(walk)), 6);
  });
});
