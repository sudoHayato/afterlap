import { describe, expect, it } from "vitest";
import {
  appendSample,
  applyChange,
  applyStop,
  createLiveSession,
  currentSport,
  newId,
  nowMs,
  segmentsFromEvents,
} from "../src";
import { makeSession, sampleAt } from "./helpers";

describe("createLiveSession", () => {
  it("creates a live session with a single 'started' event and no samples", () => {
    const s = createLiveSession("bike", 1_000, "fixed-id");
    expect(s).toEqual({
      id: "fixed-id",
      createdAt: 1_000,
      status: "live",
      events: [{ type: "started", at: 1_000, sport: "bike" }],
      samples: [],
    });
  });

  it("defaults: generated id and current time", () => {
    const before = Date.now();
    const s = createLiveSession("run");
    expect(s.id).toMatch(/^[0-9a-z]+-[0-9a-z]{1,6}$/);
    expect(s.createdAt).toBeGreaterThanOrEqual(before);
    expect(s.createdAt).toBeLessThanOrEqual(Date.now());
    expect(s.events[0]!.at).toBe(s.createdAt);
  });
});

describe("newId / nowMs", () => {
  it("newId yields distinct ids", () => {
    expect(newId()).not.toBe(newId());
  });

  it("nowMs tracks Date.now", () => {
    const before = Date.now();
    const t = nowMs();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
});

describe("applyChange", () => {
  it("appends a 'sport_changed' event and opens a new segment", () => {
    const s = createLiveSession("run", 0, "a");
    const next = applyChange(s, "bike", 5_000);
    expect(next.events.at(-1)).toEqual({ type: "sport_changed", at: 5_000, sport: "bike" });
    expect(currentSport(next.events)).toBe("bike");
    expect(segmentsFromEvents(next.events)).toHaveLength(2);
  });

  it("is a no-op (same reference) when the sport does not change", () => {
    const s = createLiveSession("run", 0, "a");
    expect(applyChange(s, "run", 5_000)).toBe(s);
  });

  it("is a no-op on a stopped session", () => {
    const stopped = applyStop(createLiveSession("run", 0, "a"), 10);
    expect(applyChange(stopped, "bike", 20)).toBe(stopped);
  });

  it("does not mutate the input", () => {
    const s = createLiveSession("run", 0, "a");
    applyChange(s, "walk", 1);
    expect(s.events).toHaveLength(1);
  });

  it("uses the current time by default", () => {
    const before = Date.now();
    const next = applyChange(createLiveSession("run", 0, "a"), "walk");
    expect(next.events.at(-1)!.at).toBeGreaterThanOrEqual(before);
  });
});

describe("applyStop", () => {
  it("marks the session stopped and appends 'stopped'", () => {
    const s = createLiveSession("run", 0, "a");
    const stopped = applyStop(s, 9_000);
    expect(stopped.status).toBe("stopped");
    expect(stopped.events.at(-1)).toEqual({ type: "stopped", at: 9_000 });
    expect(segmentsFromEvents(stopped.events)[0]!.endAt).toBe(9_000);
  });

  it("is idempotent: stopping twice returns the same reference", () => {
    const stopped = applyStop(createLiveSession("run", 0, "a"), 9_000);
    expect(applyStop(stopped, 10_000)).toBe(stopped);
    expect(stopped.events.filter((e) => e.type === "stopped")).toHaveLength(1);
  });

  it("uses the current time by default", () => {
    const before = Date.now();
    const stopped = applyStop(createLiveSession("run", 0, "a"));
    expect(stopped.events.at(-1)!.at).toBeGreaterThanOrEqual(before);
  });
});

describe("appendSample", () => {
  it("appends to a live session without mutating it", () => {
    const s = createLiveSession("run", 0, "a");
    const next = appendSample(s, sampleAt(1_000, 1));
    expect(next.samples).toHaveLength(1);
    expect(s.samples).toHaveLength(0);
    expect(next).not.toBe(s);
  });

  it("is a no-op on a stopped session", () => {
    const stopped = makeSession([
      { type: "started", at: 0, sport: "run" },
      { type: "stopped", at: 1 },
    ]);
    expect(appendSample(stopped, sampleAt(2, 1))).toBe(stopped);
  });

  it("preserves order (no sorting): the caller owns chronology", () => {
    let s = createLiveSession("run", 0, "a");
    s = appendSample(s, sampleAt(2_000, 2));
    s = appendSample(s, sampleAt(1_000, 1));
    expect(s.samples.map((x) => x.t)).toEqual([2_000, 1_000]);
  });
});

describe("full lifecycle: start → change → change → stop", () => {
  it("derives three contiguous segments and the right sports", () => {
    let s = createLiveSession("run", 0, "a");
    s = appendSample(s, sampleAt(0, 0));
    s = applyChange(s, "bike", 60_000);
    s = appendSample(s, sampleAt(60_000, 200));
    s = applyChange(s, "run", 120_000);
    s = appendSample(s, sampleAt(120_000, 600));
    s = applyStop(s, 150_000);
    s = appendSample(s, sampleAt(151_000, 700)); // ignored: stopped

    const segs = segmentsFromEvents(s.events);
    expect(segs.map((x) => [x.sport, x.startAt, x.endAt])).toEqual([
      ["run", 0, 60_000],
      ["bike", 60_000, 120_000],
      ["run", 120_000, 150_000],
    ]);
    expect(s.samples).toHaveLength(3);
    expect(s.status).toBe("stopped");
  });
});
