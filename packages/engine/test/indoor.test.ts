import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  hasGpsSegment,
  haversineMeters,
  samplesForSegment,
  segmentMetrics,
  segmentsFromEvents,
  sessionMetrics,
  type Sample,
  type SessionEvent,
} from "../src";
import { makeSession, sampleAt, track } from "./helpers";

// Sessions without a position feed (ADR 0008): a segment of a sport without
// GPS has no samples, distance 0, no pace; a session can mix both kinds and
// the boundary between them must never borrow samples across.

const MIN = 60_000;

describe("sessão só de ginásio — segmentos sem amostras", () => {
  const events: SessionEvent[] = [
    { type: "started", at: 0, sport: "strength" },
    { type: "sport_changed", at: 10 * MIN, sport: "rowing_indoor" },
    { type: "sport_changed", at: 15 * MIN, sport: "treadmill" },
    { type: "stopped", at: 25 * MIN },
  ];
  const session = makeSession(events);

  it("derives the three segments as usual (the event log does not care about GPS)", () => {
    expect(segmentsFromEvents(events).map((s) => [s.sport, s.startAt, s.endAt])).toEqual([
      ["strength", 0, 10 * MIN],
      ["rowing_indoor", 10 * MIN, 15 * MIN],
      ["treadmill", 15 * MIN, 25 * MIN],
    ]);
  });

  it("each segment is time only: duration from the events, distance 0, speed 0", () => {
    const [a, b, c] = segmentsFromEvents(events);
    expect(segmentMetrics(session, a!)).toEqual({ durationMs: 10 * MIN, distanceM: 0, avgSpeedMps: 0 });
    expect(segmentMetrics(session, b!)).toEqual({ durationMs: 5 * MIN, distanceM: 0, avgSpeedMps: 0 });
    expect(segmentMetrics(session, c!)).toEqual({ durationMs: 10 * MIN, distanceM: 0, avgSpeedMps: 0 });
    for (const seg of [a!, b!, c!]) expect(samplesForSegment(session, seg)).toEqual([]);
  });

  it("the session lasts 25 min and covers 0 m", () => {
    expect(sessionMetrics(session)).toEqual({ durationMs: 25 * MIN, distanceM: 0, avgSpeedMps: 0 });
  });

  it("a live gym segment grows with `at` and still has no distance", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "swimming_pool" }]);
    const [seg] = segmentsFromEvents(live.events);
    expect(segmentMetrics(live, seg!, 90_000)).toEqual({ durationMs: 90_000, distanceM: 0, avgSpeedMps: 0 });
    expect(sessionMetrics(live, 90_000)).toEqual({ durationMs: 90_000, distanceM: 0, avgSpeedMps: 0 });
  });

  it("samples recorded during a segment without GPS are ignored, not counted", () => {
    // They should never exist (the app turns the watcher off), but if they do
    // the metrics must not change: distance is a property of the sport.
    const stray = makeSession(events, track(0, 25 * MIN, 30_000, 100));
    expect(stray.samples.length).toBeGreaterThan(10);
    for (const seg of segmentsFromEvents(events)) {
      expect(samplesForSegment(stray, seg)).toEqual([]);
      expect(segmentMetrics(stray, seg).distanceM).toBe(0);
    }
    expect(sessionMetrics(stray).distanceM).toBe(0);
  });
});

describe("sessão mista — ginásio → rua → ginásio → rua", () => {
  // strength 0–10, run 10–20 (fixes 10:01..19:59, 1 Hz, 3 m/s), strength 20–30,
  // run 30–40 (fixes 30:01..39:59) starting 5 km away, stopped at 40.
  const events: SessionEvent[] = [
    { type: "started", at: 0, sport: "strength" },
    { type: "sport_changed", at: 10 * MIN, sport: "run" },
    { type: "sport_changed", at: 20 * MIN, sport: "strength" },
    { type: "sport_changed", at: 30 * MIN, sport: "run" },
    { type: "stopped", at: 40 * MIN },
  ];
  const run1 = track(10 * MIN + 1000, 20 * MIN - 1000, 1000, 3);
  const far = track(30 * MIN + 1000, 40 * MIN - 1000, 1000, 3).map((s) => ({ ...s, lat: s.lat + 0.045 }));
  const session = makeSession(events, [...run1, ...far]);
  const [gymA, runA, gymB, runB] = segmentsFromEvents(events);

  it("the gym segments own no samples and no distance", () => {
    for (const seg of [gymA!, gymB!]) {
      expect(samplesForSegment(session, seg)).toEqual([]);
      expect(segmentMetrics(session, seg)).toMatchObject({ durationMs: 10 * MIN, distanceM: 0, avgSpeedMps: 0 });
    }
  });

  it("a run segment next to a gym segment gets exactly its own fixes — nothing interpolated on the shared bound", () => {
    const inA = samplesForSegment(session, runA!);
    expect(inA[0]!.t).toBe(10 * MIN + 1000);
    expect(inA.at(-1)!.t).toBe(20 * MIN - 1000);
    expect(inA).toHaveLength(run1.length);
    const inB = samplesForSegment(session, runB!);
    expect(inB[0]!.t).toBe(30 * MIN + 1000);
    expect(inB.at(-1)!.t).toBe(40 * MIN - 1000);
    expect(inB).toHaveLength(far.length);
  });

  it("the 5 km between the two runs is not distance: the session is the sum of the two runs only", () => {
    const a = distanceMeters(run1);
    const b = distanceMeters(far);
    const jump = haversineMeters(run1.at(-1)!, far[0]!);
    expect(jump).toBeGreaterThan(3_000);
    expect(segmentMetrics(session, runA!).distanceM).toBeCloseTo(a, 6);
    expect(segmentMetrics(session, runB!).distanceM).toBeCloseTo(b, 6);
    expect(sessionMetrics(session).distanceM).toBeCloseTo(a + b, 6);
    // What the naive whole-span computation would have said (with the jump
    // under the 55 m/s filter, it would even have counted): the sum must not.
    expect(distanceMeters(session.samples)).toBeGreaterThan(a + b);
  });

  it("segment distances add up to the session distance, and durations to the session duration", () => {
    const segs = segmentsFromEvents(events);
    const sum = segs.reduce((acc, seg) => acc + segmentMetrics(session, seg).distanceM, 0);
    expect(sum).toBeCloseTo(sessionMetrics(session).distanceM, 6);
    const time = segs.reduce((acc, seg) => acc + segmentMetrics(session, seg).durationMs, 0);
    expect(time).toBe(sessionMetrics(session).durationMs);
    expect(sessionMetrics(session).durationMs).toBe(40 * MIN);
  });

  it("a stray sample inside the gym segment does not become a boundary sample for either run", () => {
    const withStray = makeSession(events, [...run1, sampleAt(25 * MIN, 99_000), ...far]);
    expect(samplesForSegment(withStray, gymB!)).toEqual([]);
    expect(samplesForSegment(withStray, runA!).at(-1)!.t).toBe(20 * MIN - 1000);
    expect(samplesForSegment(withStray, runB!)[0]!.t).toBe(30 * MIN + 1000);
    expect(sessionMetrics(withStray).distanceM).toBeCloseTo(sessionMetrics(session).distanceM, 6);
  });
});

describe("fronteira rua ↔ ginásio", () => {
  it("a fix exactly on the CHANGE bound belongs to the GPS segment only (never to the gym one)", () => {
    // run 0–60 s with a fix on every 10 s including the boundary (the app's
    // boundary sample), then strength 60–120 s.
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 60_000, sport: "strength" },
      { type: "stopped", at: 120_000 },
    ];
    const session = makeSession(events, track(0, 60_000, 10_000, 30));
    const [run, gym] = segmentsFromEvents(events);
    expect(samplesForSegment(session, run!).map((s) => s.t)).toEqual([0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000]);
    expect(samplesForSegment(session, gym!)).toEqual([]);
    expect(segmentMetrics(session, run!).distanceM).toBeCloseTo(180, 3);
    expect(segmentMetrics(session, gym!)).toEqual({ durationMs: 60_000, distanceM: 0, avgSpeedMps: 0 });
    expect(sessionMetrics(session).distanceM).toBeCloseTo(180, 3);
  });

  it("gym → run: the first fix after the change is the run's first sample; nothing is invented at the bound", () => {
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "strength" },
      { type: "sport_changed", at: 60_000, sport: "run" },
      { type: "stopped", at: 120_000 },
    ];
    const session = makeSession(events, track(62_000, 120_000, 2_000, 6));
    const [gym, run] = segmentsFromEvents(events);
    expect(samplesForSegment(session, gym!)).toEqual([]);
    expect(samplesForSegment(session, run!)[0]!.t).toBe(62_000);
    expect(segmentMetrics(session, run!).distanceM).toBeCloseTo(6 * 29, 3);
  });

  it("two GPS segments in a row still share an interpolated boundary sample (ADR 0008 does not change that)", () => {
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "strength" },
      { type: "sport_changed", at: 60_000, sport: "run" },
      { type: "sport_changed", at: 65_000, sport: "bike" },
      { type: "stopped", at: 70_000 },
    ];
    // Fixes at 64 s and 66 s straddle the run → bike change at 65 s.
    const session = makeSession(events, [sampleAt(64_000, 0), sampleAt(66_000, 10)]);
    const [, run, bike] = segmentsFromEvents(events);
    expect(samplesForSegment(session, run!).map((s) => s.t)).toEqual([64_000, 65_000]);
    expect(samplesForSegment(session, bike!).map((s) => s.t)).toEqual([65_000, 66_000]);
    expect(segmentMetrics(session, run!).distanceM).toBeCloseTo(5, 3);
    expect(segmentMetrics(session, bike!).distanceM).toBeCloseTo(5, 3);
    expect(sessionMetrics(session).distanceM).toBeCloseTo(10, 3);
  });

  it("live session: run then gym — the total keeps the run's distance while the gym segment ticks", () => {
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 60_000, sport: "rowing_indoor" },
    ];
    const live = makeSession(events, track(0, 60_000, 10_000, 30), "live");
    const [run, row] = segmentsFromEvents(events);
    expect(segmentMetrics(live, row!, 90_000)).toEqual({ durationMs: 30_000, distanceM: 0, avgSpeedMps: 0 });
    expect(segmentMetrics(live, run!, 90_000).distanceM).toBeCloseTo(180, 3);
    expect(sessionMetrics(live, 90_000)).toMatchObject({ durationMs: 90_000 });
    expect(sessionMetrics(live, 90_000).distanceM).toBeCloseTo(180, 3);
  });

  it("a segment built by hand (not from the session's events) is fenced by nothing but its own window", () => {
    const session = makeSession([{ type: "started", at: 0, sport: "run" }], track(0, 20_000, 5_000, 10), "live");
    const handMade = { index: 7, sport: "run" as const, startAt: 2_500, endAt: 12_500, sampleStart: 0, sampleEnd: 0 };
    expect(samplesForSegment(session, handMade).map((s) => s.t)).toEqual([2_500, 5_000, 10_000, 12_500]);
    const gymMade = { ...handMade, sport: "strength" as const };
    expect(samplesForSegment(session, gymMade)).toEqual([]);
  });

  it("a session with samples but no 'started' has no segments and therefore no distance (time still runs from createdAt)", () => {
    const odd = makeSession([], [sampleAt(0, 0), sampleAt(1_000, 3)] as Sample[], "live");
    expect(sessionMetrics(odd, 1_000)).toEqual({ durationMs: 1_000, distanceM: 0, avgSpeedMps: 0 });
  });
});

describe("hasGpsSegment — quando faz sentido mostrar uma distância total", () => {
  it("is false for a session with no segments at all", () => {
    expect(hasGpsSegment([])).toBe(false);
    expect(hasGpsSegment([{ type: "stopped", at: 1 }])).toBe(false);
  });

  it("is false for a gym-only session, whatever the sports and however many segments", () => {
    expect(hasGpsSegment([{ type: "started", at: 0, sport: "strength" }])).toBe(false);
    expect(
      hasGpsSegment([
        { type: "started", at: 0, sport: "strength" },
        { type: "sport_changed", at: 10, sport: "rowing_indoor" },
        { type: "sport_changed", at: 20, sport: "treadmill" },
        { type: "sport_changed", at: 30, sport: "swimming_pool" },
        { type: "stopped", at: 40 },
      ]),
    ).toBe(false);
  });

  it("is true from the moment the first outdoor segment opens", () => {
    expect(hasGpsSegment([{ type: "started", at: 0, sport: "run" }])).toBe(true);
    expect(
      hasGpsSegment([
        { type: "started", at: 0, sport: "strength" },
        { type: "sport_changed", at: 10, sport: "run" },
      ]),
    ).toBe(true);
  });

  it("stays true once an outdoor segment is in the log, including while a later gym segment records", () => {
    // This is the rule the live screen uses: the kilometres already run do
    // not disappear because the founder moved to the rowing machine.
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 10 * MIN, sport: "strength" },
    ];
    expect(hasGpsSegment(events)).toBe(true);
    expect(hasGpsSegment([...events, { type: "stopped", at: 20 * MIN }])).toBe(true);
  });

  it("ignores 'recovered' events, like every other derivation", () => {
    expect(
      hasGpsSegment([
        { type: "started", at: 0, sport: "strength" },
        { type: "recovered", at: 5 },
      ]),
    ).toBe(false);
  });

  it("agrees with the session's distance being showable: gym-only sessions have none", () => {
    const gym = makeSession([
      { type: "started", at: 0, sport: "strength" },
      { type: "stopped", at: 10 * MIN },
    ]);
    expect(hasGpsSegment(gym.events)).toBe(false);
    expect(sessionMetrics(gym).distanceM).toBe(0);

    const mixed = makeSession(
      [
        { type: "started", at: 0, sport: "run" },
        { type: "sport_changed", at: 60_000, sport: "strength" },
        { type: "stopped", at: 120_000 },
      ],
      track(0, 60_000, 10_000, 30),
    );
    expect(hasGpsSegment(mixed.events)).toBe(true);
    expect(sessionMetrics(mixed).distanceM).toBeCloseTo(180, 3);
  });
});

describe("casos defensivos (nunca produzidos pelas transições, nunca podem rebentar)", () => {
  it("zero duration reports zero speed for the session and for a GPS segment (no division by zero)", () => {
    expect(sessionMetrics(makeSession([], [], "stopped"))).toEqual({ durationMs: 0, distanceM: 0, avgSpeedMps: 0 });
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], [sampleAt(0, 0)]);
    const [seg] = segmentsFromEvents(live.events);
    expect(segmentMetrics(live, seg!, 0)).toEqual({ durationMs: 0, distanceM: 0, avgSpeedMps: 0 });
  });

  it("a GPS segment left open by a second 'started' has no fence on its right, even with a gym segment after it", () => {
    // segmentsFromEvents keeps the run open (endAt null) when a second
    // 'started' arrives instead of a 'sport_changed'; the span must not choke on it.
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "started", at: 10_000, sport: "strength" },
    ];
    const session = makeSession(events, track(0, 20_000, 5_000, 10), "live");
    const [run, gym] = segmentsFromEvents(events);
    expect(run!.endAt).toBeNull();
    expect(samplesForSegment(session, run!, 12_000).map((s) => s.t)).toEqual([0, 5_000, 10_000, 12_000]);
    expect(samplesForSegment(session, gym!, 12_000)).toEqual([]);
  });
});
