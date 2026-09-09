import { describe, expect, it } from "vitest";
import { currentSport, segmentsFromEvents, type SessionEvent } from "../src";

describe("segmentsFromEvents — derivação de segmentos a partir de eventos", () => {
  it("returns no segments for an empty log", () => {
    expect(segmentsFromEvents([])).toEqual([]);
  });

  it("a lone 'started' opens one segment with no end", () => {
    const segs = segmentsFromEvents([{ type: "started", at: 1000, sport: "run" }]);
    expect(segs).toEqual([
      { index: 0, sport: "run", startAt: 1000, endAt: null, sampleStart: 1000, sampleEnd: 1000 },
    ]);
  });

  it("each 'sport_changed' closes the current segment and opens the next, contiguous", () => {
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 10_000, sport: "bike" },
      { type: "sport_changed", at: 25_000, sport: "walk" },
    ];
    const segs = segmentsFromEvents(events);
    expect(segs.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(segs.map((s) => s.sport)).toEqual(["run", "bike", "walk"]);
    expect(segs.map((s) => [s.startAt, s.endAt])).toEqual([
      [0, 10_000],
      [10_000, 25_000],
      [25_000, null],
    ]);
    // Boundaries are shared: previous end === next start.
    expect(segs[0]!.endAt).toBe(segs[1]!.startAt);
    expect(segs[1]!.endAt).toBe(segs[2]!.startAt);
  });

  it("'stopped' closes the last segment and nothing else changes", () => {
    const segs = segmentsFromEvents([
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 10_000, sport: "bike" },
      { type: "stopped", at: 30_000 },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[1]).toMatchObject({ sport: "bike", startAt: 10_000, endAt: 30_000 });
    expect(segs[0]).toMatchObject({ startAt: 0, endAt: 10_000 });
  });

  it("sampleStart/sampleEnd mirror startAt/endAt (endAt null → sampleEnd stays at start)", () => {
    const segs = segmentsFromEvents([
      { type: "started", at: 5, sport: "walk" },
      { type: "sport_changed", at: 9, sport: "run" },
    ]);
    expect(segs[0]).toMatchObject({ sampleStart: 5, sampleEnd: 9 });
    expect(segs[1]).toMatchObject({ sampleStart: 9, sampleEnd: 9, endAt: null });
  });

  it("changing to the same sport twice still creates a new segment (the engine does not dedupe here)", () => {
    // applyChange() is what refuses same-sport changes; the derivation is literal.
    const segs = segmentsFromEvents([
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 1, sport: "run" },
    ]);
    expect(segs).toHaveLength(2);
  });

  it("'sport_changed' and 'stopped' before any 'started' are ignored", () => {
    const segs = segmentsFromEvents([
      { type: "sport_changed", at: 1, sport: "bike" },
      { type: "stopped", at: 2 },
      { type: "started", at: 3, sport: "run" },
    ]);
    expect(segs).toEqual([
      { index: 0, sport: "run", startAt: 3, endAt: null, sampleStart: 3, sampleEnd: 3 },
    ]);
  });

  it("'recovered' events never create, close or alter segments", () => {
    const base: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "sport_changed", at: 10, sport: "bike" },
    ];
    const withRecovered: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "recovered", at: 4 },
      { type: "sport_changed", at: 10, sport: "bike" },
      { type: "recovered", at: 12 },
      { type: "recovered", at: 13 },
    ];
    expect(segmentsFromEvents(withRecovered)).toEqual(segmentsFromEvents(base));
  });

  it("a second 'started' restarts the derivation (index 0 again, previous segments kept)", () => {
    // Defensive: the transitions never produce this, but the derivation must not crash.
    const segs = segmentsFromEvents([
      { type: "started", at: 0, sport: "run" },
      { type: "started", at: 5, sport: "bike" },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[1]).toMatchObject({ index: 0, sport: "bike", startAt: 5 });
  });

  it("does not mutate the input events", () => {
    const events: SessionEvent[] = [
      { type: "started", at: 0, sport: "run" },
      { type: "stopped", at: 1 },
    ];
    const snapshot = JSON.stringify(events);
    segmentsFromEvents(events);
    expect(JSON.stringify(events)).toBe(snapshot);
  });
});

describe("currentSport", () => {
  it("is null without a started event", () => {
    expect(currentSport([])).toBeNull();
    expect(currentSport([{ type: "stopped", at: 1 }])).toBeNull();
  });

  it("is the sport of the last segment, even after stop", () => {
    expect(currentSport([{ type: "started", at: 0, sport: "walk" }])).toBe("walk");
    expect(
      currentSport([
        { type: "started", at: 0, sport: "walk" },
        { type: "sport_changed", at: 1, sport: "bike" },
        { type: "stopped", at: 2 },
      ]),
    ).toBe("bike");
  });
});
