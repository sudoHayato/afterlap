import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatDay,
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from "../src";

describe("formatDuration", () => {
  it("mm:ss under an hour, hh:mm:ss from one hour", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(59_999)).toBe("00:59");
    expect(formatDuration(61_000)).toBe("01:01");
    expect(formatDuration(3_600_000)).toBe("01:00:00");
    expect(formatDuration(3_661_000)).toBe("01:01:01");
    expect(formatDuration(36_000_000)).toBe("10:00:00");
  });

  it("clamps negatives to zero", () => {
    expect(formatDuration(-5_000)).toBe("00:00");
  });
});

describe("formatDistance", () => {
  it("metres under 1 km, rounded", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(999.4)).toBe("999 m");
    expect(formatDistance(12.6)).toBe("13 m");
  });

  it("switches to km when the rounded value reaches 1000 (never prints '1000 m')", () => {
    expect(formatDistance(999.5)).toBe("1.00 km");
    expect(formatDistance(999.999)).toBe("1.00 km");
  });

  it("two decimals under 10 km, one decimal from 10 km", () => {
    expect(formatDistance(1_000)).toBe("1.00 km");
    expect(formatDistance(1_234)).toBe("1.23 km");
    expect(formatDistance(9_999)).toBe("10.00 km");
    expect(formatDistance(10_000)).toBe("10.0 km");
    expect(formatDistance(12_345)).toBe("12.3 km");
  });
});

describe("formatPace", () => {
  it("is a dash under 20 m", () => {
    expect(formatPace(0, 60_000)).toBe("—");
    expect(formatPace(19.9, 60_000)).toBe("—");
  });

  it("formats minutes:seconds per km", () => {
    expect(formatPace(1_000, 300_000)).toBe("5:00/km");
    expect(formatPace(2_000, 300_000)).toBe("2:30/km");
    expect(formatPace(1_000, 330_500)).toBe("5:31/km"); // 330.5 s → rounds up
    expect(formatPace(20, 6_000)).toBe("5:00/km");
  });

  it("is a dash for zero duration or slower than 60 min/km", () => {
    expect(formatPace(1_000, 0)).toBe("—");
    expect(formatPace(1_000, 3_600_000)).toBe("60:00/km");
    expect(formatPace(1_000, 3_601_000)).toBe("—");
  });

  it("never renders 60 seconds: 299.6 s/km is 5:00, not 4:60", () => {
    expect(formatPace(1_000, 299_600)).toBe("5:00/km");
    expect(formatPace(1_000, 359_990)).toBe("6:00/km");
    expect(formatPace(1_000, 3_599_900)).toBe("60:00/km");
  });
});

describe("formatSpeedKmh", () => {
  it("is a dash at or below 0.2 m/s and for non-finite input", () => {
    expect(formatSpeedKmh(0)).toBe("—");
    expect(formatSpeedKmh(0.2)).toBe("—");
    expect(formatSpeedKmh(-3)).toBe("—");
    expect(formatSpeedKmh(Number.NaN)).toBe("—");
    expect(formatSpeedKmh(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("converts m/s to km/h with one decimal", () => {
    expect(formatSpeedKmh(0.21)).toBe("0.8 km/h");
    expect(formatSpeedKmh(7.4)).toBe("26.6 km/h");
    expect(formatSpeedKmh(10)).toBe("36.0 km/h");
  });
});

describe("formatClock / formatDay", () => {
  const ts = Date.UTC(2026, 8, 6, 7, 12, 0);

  it("formatClock renders hh:mm for an explicit locale", () => {
    expect(formatClock(ts, "en-GB")).toMatch(/^\d{2}:\d{2}$/);
    expect(formatClock(ts, "pt-PT")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formatDay renders a short weekday/month/day in the given locale", () => {
    const en = formatDay(ts, "en-GB");
    expect(en).toMatch(/Sun/);
    expect(en).toMatch(/Sep/);
    expect(en).toMatch(/6/);
    const pt = formatDay(ts, "pt-PT");
    expect(pt.length).toBeGreaterThan(0);
    expect(pt).not.toBe(en);
  });

  it("both accept an omitted locale (runtime default)", () => {
    expect(formatClock(ts)).toMatch(/\d/);
    expect(formatDay(ts)).toMatch(/\d/);
  });
});
