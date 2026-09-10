import { formatDistance, formatPace, formatSpeedKmh } from "@bricklap/engine";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_UNIT_SYSTEM,
  UNIT_SYSTEMS,
  formatDistanceForUnit,
  formatPaceForUnit,
  formatSpeedForUnit,
} from "../src/units";

describe("unit formatters — preferência metric/imperial", () => {
  it("metric delegates to the engine's existing formatters, unchanged", () => {
    expect(formatDistanceForUnit(1234)).toBe(formatDistance(1234));
    expect(formatSpeedForUnit(3)).toBe(formatSpeedKmh(3));
    expect(formatPaceForUnit(1000, 300_000)).toBe(formatPace(1000, 300_000));
  });

  it("defaults to metric when no unit is passed", () => {
    expect(formatDistanceForUnit(500)).toBe(formatDistanceForUnit(500, "metric"));
    expect(formatSpeedForUnit(4)).toBe(formatSpeedForUnit(4, "metric"));
    expect(formatPaceForUnit(1000, 300_000)).toBe(formatPaceForUnit(1000, 300_000, "metric"));
  });

  it("imperial is declared but not implemented: every formatter throws instead of guessing", () => {
    expect(() => formatDistanceForUnit(1000, "imperial")).toThrow(/not implemented/);
    expect(() => formatSpeedForUnit(3, "imperial")).toThrow(/not implemented/);
    expect(() => formatPaceForUnit(1000, 300_000, "imperial")).toThrow(/not implemented/);
  });

  it("DEFAULT_UNIT_SYSTEM is metric, and both systems are declared in UNIT_SYSTEMS", () => {
    expect(DEFAULT_UNIT_SYSTEM).toBe("metric");
    expect(UNIT_SYSTEMS).toEqual(["metric", "imperial"]);
  });
});
