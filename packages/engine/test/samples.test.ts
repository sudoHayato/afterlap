import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  durationMs,
  metricsFor,
  samplesForSegment,
  samplesInRange,
  segmentMetrics,
  segmentsFromEvents,
  sessionBounds,
  sessionMetrics,
} from "../src";
import { makeSession, sampleAt, track } from "./helpers";

// run 0–10 s, bike 10–20 s, stopped at 20 s; one sample every 5 s, 10 m apart.
const EVENTS = [
  { type: "started", at: 0, sport: "run" },
  { type: "sport_changed", at: 10_000, sport: "bike" },
  { type: "stopped", at: 20_000 },
] as const;
const SAMPLES = track(0, 20_000, 5_000, 10); // t = 0, 5k, 10k, 15k, 20k
const STOPPED = makeSession([...EVENTS], SAMPLES);

describe("samplesInRange", () => {
  it("is inclusive on both ends", () => {
    expect(samplesInRange(SAMPLES, 5_000, 15_000).map((s) => s.t)).toEqual([5_000, 10_000, 15_000]);
  });

  it("returns nothing for an empty or inverted range", () => {
    expect(samplesInRange(SAMPLES, 6_000, 9_000)).toEqual([]);
    expect(samplesInRange(SAMPLES, 15_000, 5_000)).toEqual([]);
  });
});

describe("samplesForSegment — atribuição de amostras a segmentos", () => {
  const [run, bike] = segmentsFromEvents(STOPPED.events);

  it("gives each segment the samples inside its time window", () => {
    expect(samplesForSegment(STOPPED, run!).map((s) => s.t)).toEqual([0, 5_000, 10_000]);
    expect(samplesForSegment(STOPPED, bike!).map((s) => s.t)).toEqual([10_000, 15_000, 20_000]);
  });

  it("a sample exactly on the boundary belongs to BOTH adjacent segments", () => {
    const boundary = SAMPLES.find((s) => s.t === 10_000)!;
    expect(samplesForSegment(STOPPED, run!)).toContain(boundary);
    expect(samplesForSegment(STOPPED, bike!)).toContain(boundary);
  });

  it("a sample 1 ms after the boundary belongs only to the next segment", () => {
    const s = makeSession([...EVENTS], [sampleAt(9_999, 0), sampleAt(10_001, 10)]);
    const [a, b] = segmentsFromEvents(s.events);
    expect(samplesForSegment(s, a!).map((x) => x.t)).toEqual([9_999]);
    expect(samplesForSegment(s, b!).map((x) => x.t)).toEqual([10_001]);
  });

  it("because the boundary sample is shared, segment distances add up to the session distance", () => {
    const perSegment = [run!, bike!].map((seg) => distanceMeters(samplesForSegment(STOPPED, seg)));
    const total = distanceMeters(STOPPED.samples);
    expect(perSegment[0]! + perSegment[1]!).toBeCloseTo(total, 6);
    expect(total).toBeCloseTo(40, 3);
  });

  it("the open segment of a live session ends at `at`", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(live.events);
    expect(samplesForSegment(live, seg!, 12_000).map((s) => s.t)).toEqual([0, 5_000, 10_000]);
  });

  it("an open segment of a stopped session (no 'stopped' event) ends at the last sample", () => {
    const odd = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "stopped");
    const [seg] = segmentsFromEvents(odd.events);
    expect(samplesForSegment(odd, seg!).map((s) => s.t)).toEqual([0, 5_000, 10_000, 15_000, 20_000]);
  });
});

describe("sessionBounds", () => {
  it("start = first 'started', end = 'stopped'", () => {
    expect(sessionBounds(STOPPED)).toEqual({ start: 0, end: 20_000 });
  });

  it("falls back to the last sample when there is no 'stopped'", () => {
    const live = makeSession([{ type: "started", at: 100, sport: "run" }], [sampleAt(500, 0), sampleAt(900, 1)]);
    expect(sessionBounds(live)).toEqual({ start: 100, end: 900 });
  });

  it("falls back to start when there are no samples, and to createdAt when there is no 'started'", () => {
    const bare = makeSession([{ type: "started", at: 100, sport: "run" }]);
    expect(sessionBounds(bare)).toEqual({ start: 100, end: 100 });

    const noStart = { ...makeSession([]), createdAt: 42 };
    expect(sessionBounds(noStart)).toEqual({ start: 42, end: 42 });
  });
});

describe("durationMs", () => {
  it("live: elapsed since start up to `at`", () => {
    const live = makeSession([{ type: "started", at: 1_000, sport: "run" }]);
    expect(durationMs(live, 4_500)).toBe(3_500);
  });

  it("stopped: stop minus start, ignoring `at`", () => {
    expect(durationMs(STOPPED, 999_999)).toBe(20_000);
  });

  it("never negative", () => {
    const live = makeSession([{ type: "started", at: 1_000, sport: "run" }]);
    expect(durationMs(live, 500)).toBe(0);
  });
});

describe("metricsFor / segmentMetrics / sessionMetrics", () => {
  it("metricsFor slices the samples and derives average speed", () => {
    const m = metricsFor(SAMPLES, 0, 10_000);
    expect(m.durationMs).toBe(10_000);
    expect(m.distanceM).toBeCloseTo(20, 3);
    expect(m.avgSpeedMps).toBeCloseTo(2, 3);
  });

  it("metricsFor with zero duration reports zero speed (no division by zero)", () => {
    const m = metricsFor(SAMPLES, 5_000, 5_000);
    expect(m).toEqual({ durationMs: 0, distanceM: 0, avgSpeedMps: 0 });
  });

  it("metricsFor clamps an inverted window to zero duration", () => {
    expect(metricsFor(SAMPLES, 10_000, 0).durationMs).toBe(0);
  });

  it("segmentMetrics of a closed segment uses its own window", () => {
    const [run, bike] = segmentsFromEvents(STOPPED.events);
    expect(segmentMetrics(STOPPED, run!)).toMatchObject({ durationMs: 10_000 });
    expect(segmentMetrics(STOPPED, bike!).distanceM).toBeCloseTo(20, 3);
  });

  it("segmentMetrics of the open segment of a live session grows with `at`", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(live.events);
    expect(segmentMetrics(live, seg!, 5_000).durationMs).toBe(5_000);
    expect(segmentMetrics(live, seg!, 5_000).distanceM).toBeCloseTo(10, 3);
    expect(segmentMetrics(live, seg!, 20_000).distanceM).toBeCloseTo(40, 3);
  });

  it("segmentMetrics of an open segment on a stopped session ends at the session end", () => {
    const odd = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "stopped");
    const [seg] = segmentsFromEvents(odd.events);
    expect(segmentMetrics(odd, seg!, 1)).toMatchObject({ durationMs: 20_000 });
  });

  it("sessionMetrics: stopped session ignores `at`, live session uses it", () => {
    expect(sessionMetrics(STOPPED, 1)).toMatchObject({ durationMs: 20_000 });
    expect(sessionMetrics(STOPPED).distanceM).toBeCloseTo(40, 3);

    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    expect(sessionMetrics(live, 7_500)).toMatchObject({ durationMs: 7_500 });
    expect(sessionMetrics(live, 7_500).distanceM).toBeCloseTo(10, 3);
  });
});
