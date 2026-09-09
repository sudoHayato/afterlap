import { describe, expect, it } from "vitest";
import { destination, distanceMeters, haversineMeters, LISBON, toRad, type Sample } from "../src";
import { sampleAt } from "./helpers";

const PORTO = { lat: 41.1579, lng: -8.6291 };

describe("toRad / haversineMeters / destination", () => {
  it("toRad converts degrees to radians", () => {
    expect(toRad(180)).toBeCloseTo(Math.PI, 12);
    expect(toRad(0)).toBe(0);
  });

  it("Lisbon → Porto is about 274 km (great-circle)", () => {
    const d = haversineMeters(LISBON, PORTO);
    expect(d).toBeGreaterThan(270_000);
    expect(d).toBeLessThan(279_000);
  });

  it("is symmetric and zero for the same point", () => {
    expect(haversineMeters(LISBON, PORTO)).toBeCloseTo(haversineMeters(PORTO, LISBON), 6);
    expect(haversineMeters(LISBON, LISBON)).toBe(0);
  });

  it("destination then haversine round-trips the distance (small and large)", () => {
    for (const meters of [1, 55, 1_000, 250_000]) {
      const p = destination(LISBON.lat, LISBON.lng, 0.7, meters);
      expect(haversineMeters(LISBON, p)).toBeCloseTo(meters, 3);
    }
  });

  it("destination heading 0 moves north (lat up, lng unchanged)", () => {
    const p = destination(LISBON.lat, LISBON.lng, 0, 1_000);
    expect(p.lat).toBeGreaterThan(LISBON.lat);
    expect(p.lng).toBeCloseTo(LISBON.lng, 9);
  });
});

describe("distanceMeters — filtro de velocidade", () => {
  it("returns 0 for zero or one sample", () => {
    expect(distanceMeters([])).toBe(0);
    expect(distanceMeters([sampleAt(0, 0)])).toBe(0);
  });

  it("sums plausible legs", () => {
    const samples = [sampleAt(0, 0), sampleAt(1_000, 3), sampleAt(2_000, 6)];
    expect(distanceMeters(samples)).toBeCloseTo(6, 3);
  });

  it("keeps a leg at 54.9 m/s and drops a leg at 55.1 m/s (threshold is 55 m/s, strict)", () => {
    const fast = [sampleAt(0, 0), sampleAt(1_000, 54.9)];
    expect(distanceMeters(fast)).toBeCloseTo(54.9, 3);

    const tooFast = [sampleAt(0, 0), sampleAt(1_000, 55.1)];
    expect(distanceMeters(tooFast)).toBe(0);
  });

  it("drops only the teleport leg, not the legs around it", () => {
    const samples = [
      sampleAt(0, 0),
      sampleAt(1_000, 3), // 3 m/s ok
      sampleAt(2_000, 1_003), // 1000 m/s → teleport, dropped
      sampleAt(3_000, 1_006), // 3 m/s ok
    ];
    expect(distanceMeters(samples)).toBeCloseTo(6, 3);
  });

  it("identical timestamps use a 1 ms floor, so any real jump is dropped but a repeat point is fine", () => {
    // 1 m in 0 s → 1000 m/s after the floor → dropped.
    expect(distanceMeters([sampleAt(500, 0), sampleAt(500, 1)])).toBe(0);
    // Same point twice → 0 m, kept (adds nothing).
    expect(distanceMeters([sampleAt(500, 0), sampleAt(500, 0)])).toBe(0);
    // 0.05 m in 0 s → 50 m/s after the floor → kept.
    expect(distanceMeters([sampleAt(500, 0), sampleAt(500, 0.05)])).toBeCloseTo(0.05, 4);
  });

  it("uses elapsed time, not sample count: a 100 m leg over 10 s is only 10 m/s", () => {
    expect(distanceMeters([sampleAt(0, 0), sampleAt(10_000, 100)])).toBeCloseTo(100, 3);
  });

  it("ignores the reported speedMps field entirely", () => {
    const a: Sample = { ...sampleAt(0, 0), speedMps: 999 };
    const b: Sample = { ...sampleAt(1_000, 3), speedMps: 999 };
    expect(distanceMeters([a, b])).toBeCloseTo(3, 3);
  });
});
