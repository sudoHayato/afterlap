import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  durationMs,
  interpolateAt,
  isLive,
  metricsFor,
  samplesBetween,
  samplesForSegment,
  samplesInRange,
  segmentMetrics,
  segmentsFromEvents,
  sessionBounds,
  sessionMetrics,
  type Sample,
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

describe("interpolateAt", () => {
  const a: Sample = { t: 0, lat: 10, lng: 20, speedMps: 2, source: "gps" };
  const b: Sample = { t: 10_000, lat: 11, lng: 22, speedMps: 4, source: "sim" };

  it("interpolates position and speed linearly in time, keeping the earlier source", () => {
    expect(interpolateAt([a, b], 2_500)).toEqual({
      t: 2_500,
      lat: 10.25,
      lng: 20.5,
      speedMps: 2.5,
      source: "gps",
    });
  });

  it("is null outside the recorded span or when a sample already sits at t", () => {
    expect(interpolateAt([a, b], -1)).toBeNull();
    expect(interpolateAt([a, b], 10_001)).toBeNull();
    expect(interpolateAt([a, b], 0)).toBeNull();
    expect(interpolateAt([a, b], 10_000)).toBeNull();
    expect(interpolateAt([], 5)).toBeNull();
    expect(interpolateAt([a], 5)).toBeNull();
  });
});

describe("samplesBetween — janela com fronteiras interpoladas", () => {
  it("returns real samples when they sit exactly on both bounds", () => {
    expect(samplesBetween(SAMPLES, 5_000, 15_000)).toEqual(samplesInRange(SAMPLES, 5_000, 15_000));
  });

  it("synthesises a sample on a bound that falls between two real samples", () => {
    const out = samplesBetween(SAMPLES, 2_500, 12_500);
    expect(out.map((s) => s.t)).toEqual([2_500, 5_000, 10_000, 12_500]);
    expect(out[0]!.source).toBe("sim");
  });

  it("does not synthesise beyond the recorded span", () => {
    expect(samplesBetween(SAMPLES, -5_000, 2_500).map((s) => s.t)).toEqual([0, 2_500]);
    expect(samplesBetween(SAMPLES, 17_500, 30_000).map((s) => s.t)).toEqual([17_500, 20_000]);
  });

  it("an inverted window is empty; a zero-length window yields at most one sample", () => {
    expect(samplesBetween(SAMPLES, 15_000, 5_000)).toEqual([]);
    expect(samplesBetween(SAMPLES, 5_000, 5_000).map((s) => s.t)).toEqual([5_000]);
    expect(samplesBetween(SAMPLES, 7_500, 7_500).map((s) => s.t)).toEqual([7_500]);
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

  it("a leg that straddles the boundary is split: both segments get an interpolated boundary sample", () => {
    // 10 m in 2 s (5 m/s) from 9 s to 11 s; the change is at 10 s, between the two samples.
    const s = makeSession([...EVENTS], [sampleAt(9_000, 0), sampleAt(11_000, 10)]);
    const [a, b] = segmentsFromEvents(s.events);
    const inA = samplesForSegment(s, a!);
    const inB = samplesForSegment(s, b!);
    expect(inA.map((x) => x.t)).toEqual([9_000, 10_000]);
    expect(inB.map((x) => x.t)).toEqual([10_000, 11_000]);
    expect(inA[1]).toEqual(inB[0]);
    expect(distanceMeters(inA)).toBeCloseTo(5, 3);
    expect(distanceMeters(inB)).toBeCloseTo(5, 3);
    expect(distanceMeters(inA) + distanceMeters(inB)).toBeCloseTo(distanceMeters(s.samples), 6);
  });

  it("segment distances add up to the session distance (shared boundary sample)", () => {
    const perSegment = [run!, bike!].map((seg) => distanceMeters(samplesForSegment(STOPPED, seg)));
    const total = distanceMeters(STOPPED.samples);
    expect(perSegment[0]! + perSegment[1]!).toBeCloseTo(total, 6);
    expect(total).toBeCloseTo(40, 3);
  });

  it("the open segment of a live session ends at `at`, interpolating there if needed", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(live.events);
    expect(samplesForSegment(live, seg!, 12_000).map((s) => s.t)).toEqual([0, 5_000, 10_000, 12_000]);
    expect(samplesForSegment(live, seg!, 10_000).map((s) => s.t)).toEqual([0, 5_000, 10_000]);
  });

  it("an open segment of a stopped session (no 'stopped' event) ends at the last sample", () => {
    const odd = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "stopped");
    const [seg] = segmentsFromEvents(odd.events);
    expect(samplesForSegment(odd, seg!).map((s) => s.t)).toEqual([0, 5_000, 10_000, 15_000, 20_000]);
  });
});

describe("isLive / sessionBounds — eventos mandam sobre o status", () => {
  it("isLive needs status live AND no 'stopped' event", () => {
    expect(isLive(makeSession([{ type: "started", at: 0, sport: "run" }]))).toBe(true);
    expect(isLive(STOPPED)).toBe(false);
    const stale = makeSession([{ type: "started", at: 0, sport: "run" }, { type: "stopped", at: 10_000 }], [], "live");
    expect(isLive(stale)).toBe(false);
  });

  it("start = first 'started', end = 'stopped'", () => {
    expect(sessionBounds(STOPPED)).toEqual({ start: 0, end: 20_000 });
  });

  it("with two 'stopped' events the LAST wins, same as segmentsFromEvents", () => {
    const twice = makeSession([
      { type: "started", at: 0, sport: "run" },
      { type: "stopped", at: 10 },
      { type: "stopped", at: 99 },
    ]);
    expect(sessionBounds(twice).end).toBe(99);
    expect(segmentsFromEvents(twice.events)[0]!.endAt).toBe(99);
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

  it("status live but a 'stopped' event recorded: the event wins", () => {
    const stale = makeSession([{ type: "started", at: 0, sport: "run" }, { type: "stopped", at: 10_000 }], SAMPLES, "live");
    expect(durationMs(stale, 50_000)).toBe(10_000);
    expect(sessionMetrics(stale, 50_000).durationMs).toBe(10_000);
    const [seg] = segmentsFromEvents(stale.events);
    expect(segmentMetrics(stale, seg!, 50_000).durationMs).toBe(10_000);
  });

  it("stopped without a 'stopped' event: last sample, or zero without samples", () => {
    const odd = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "stopped");
    expect(durationMs(odd, 1)).toBe(20_000);
    expect(durationMs({ ...odd, samples: [] }, 1)).toBe(0);
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

  it("segmentMetrics of the open segment of a live session grows with `at`, pro rata between samples", () => {
    const live = makeSession([{ type: "started", at: 0, sport: "run" }], SAMPLES, "live");
    const [seg] = segmentsFromEvents(live.events);
    expect(segmentMetrics(live, seg!, 5_000).durationMs).toBe(5_000);
    expect(segmentMetrics(live, seg!, 5_000).distanceM).toBeCloseTo(10, 3);
    expect(segmentMetrics(live, seg!, 7_500).distanceM).toBeCloseTo(15, 3);
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
    expect(sessionMetrics(live, 7_500).distanceM).toBeCloseTo(15, 3);
  });

  it("sessionMetrics ignores samples recorded after the stop (up to the stop instant only)", () => {
    const stray = makeSession([...EVENTS], [...SAMPLES, sampleAt(25_000, 999)]);
    expect(sessionMetrics(stray).distanceM).toBeCloseTo(40, 3);
  });
});
