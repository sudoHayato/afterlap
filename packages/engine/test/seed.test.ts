import { describe, expect, it } from "vitest";
import { seedSessions, segmentsFromEvents, sessionBounds, sessionMetrics, segmentMetrics } from "../src";

describe("seedSessions — sessões de demonstração", () => {
  const seeds = seedSessions();

  it("returns two stopped sessions with stable ids, newest first", () => {
    expect(seeds.map((s) => s.id)).toEqual(["seed-brick", "seed-easy"]);
    expect(seeds.every((s) => s.status === "stopped")).toBe(true);
    expect(seeds[0]!.createdAt).toBeGreaterThan(seeds[1]!.createdAt);
  });

  it("is deterministic across calls", () => {
    expect(seedSessions()).toEqual(seeds);
  });

  it("events are started → sport_changed × 2 → stopped, in chronological order", () => {
    for (const s of seeds) {
      expect(s.events.map((e) => e.type)).toEqual(["started", "sport_changed", "sport_changed", "stopped"]);
      for (let i = 1; i < s.events.length; i++) {
        expect(s.events[i]!.at).toBeGreaterThan(s.events[i - 1]!.at);
      }
      expect(s.events[0]!.at).toBe(s.createdAt);
    }
  });

  it("brick = run → bike → run; easy = walk → run → walk", () => {
    expect(segmentsFromEvents(seeds[0]!.events).map((x) => x.sport)).toEqual(["run", "bike", "run"]);
    expect(segmentsFromEvents(seeds[1]!.events).map((x) => x.sport)).toEqual(["walk", "run", "walk"]);
  });

  it("every sample lies within [start, stop] and samples are chronological", () => {
    for (const s of seeds) {
      const { start, end } = sessionBounds(s);
      expect(s.samples.length).toBeGreaterThan(100);
      for (let i = 0; i < s.samples.length; i++) {
        const sample = s.samples[i]!;
        expect(sample.t).toBeGreaterThanOrEqual(start);
        expect(sample.t).toBeLessThanOrEqual(end);
        if (i > 0) expect(sample.t).toBeGreaterThan(s.samples[i - 1]!.t);
        expect(sample.source).toBe("sim");
      }
    }
  });

  it("each segment has samples and positive, finite metrics", () => {
    for (const s of seeds) {
      const total = sessionMetrics(s);
      expect(Number.isFinite(total.distanceM)).toBe(true);
      expect(total.distanceM).toBeGreaterThan(1_000);
      expect(total.durationMs).toBe(s.events.at(-1)!.at - s.createdAt);
      for (const seg of segmentsFromEvents(s.events)) {
        const m = segmentMetrics(s, seg);
        expect(m.durationMs).toBeGreaterThan(0);
        expect(m.distanceM).toBeGreaterThan(0);
        expect(m.avgSpeedMps).toBeGreaterThan(0);
        expect(Number.isFinite(m.avgSpeedMps)).toBe(true);
      }
    }
  });

  it("segment distances add up to the session distance even though changes fall between samples", () => {
    let missedBoundaries = 0;
    for (const s of seeds) {
      const segs = segmentsFromEvents(s.events);
      const sum = segs.reduce((acc, seg) => acc + segmentMetrics(s, seg).distanceM, 0);
      const total = sessionMetrics(s).distanceM;
      expect(Math.abs(sum - total)).toBeLessThan(0.01);
      const boundaries = segs.slice(1).map((seg) => seg.startAt);
      missedBoundaries += boundaries.filter((t) => !s.samples.some((x) => x.t === t)).length;
    }
    // The brick session's first change (38:21) is off the 8 s sample grid, so the
    // property above only holds because samplesBetween interpolates that boundary.
    expect(missedBoundaries).toBeGreaterThan(0);
  });

  it("the brick session lasts 38:21 + 41:07 + 22:50", () => {
    const brick = seeds[0]!;
    const expected = (38 * 60 + 21 + 41 * 60 + 7 + 22 * 60 + 50) * 1000;
    expect(sessionMetrics(brick).durationMs).toBe(expected);
  });
});
