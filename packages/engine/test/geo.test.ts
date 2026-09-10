import { describe, expect, it } from "vitest";
import {
  createSim,
  haversineMeters,
  LISBON,
  nextSport,
  sampleFromGps,
  sampleFromSim,
  SIM_SPEED_MPS,
  SPORT_HAS_GPS,
  SPORT_PACE_KIND,
  SPORTS,
  sportHasGps,
  stepSim,
  typicalSpeed,
} from "../src";

describe("sports metadata", () => {
  it("SPORTS lists the four outdoor sports first, then the four without GPS (ADR 0008)", () => {
    expect(SPORTS).toEqual([
      "run",
      "bike",
      "walk",
      "transition",
      "strength",
      "rowing_indoor",
      "treadmill",
      "swimming_pool",
    ]);
  });

  it("every sport has a pace kind; simulated speed is positive with GPS and zero without", () => {
    for (const sport of SPORTS) {
      expect(["pace", "speed", "none"]).toContain(SPORT_PACE_KIND[sport]);
      expect(typicalSpeed(sport)).toBe(SIM_SPEED_MPS[sport]);
      if (sportHasGps(sport)) expect(SIM_SPEED_MPS[sport]).toBeGreaterThan(0);
      else expect(SIM_SPEED_MPS[sport]).toBe(0);
    }
  });

  it("pace for feet, speed for the bike, none for transitions and for every sport without GPS", () => {
    expect(SPORT_PACE_KIND.run).toBe("pace");
    expect(SPORT_PACE_KIND.walk).toBe("pace");
    expect(SPORT_PACE_KIND.bike).toBe("speed");
    expect(SPORT_PACE_KIND.transition).toBe("none");
    for (const sport of ["strength", "rowing_indoor", "treadmill", "swimming_pool"] as const) {
      expect(SPORT_PACE_KIND[sport]).toBe("none");
    }
  });

  it("SPORT_HAS_GPS / sportHasGps: outdoor yes, gym and pool no", () => {
    expect(SPORTS.filter(sportHasGps)).toEqual(["run", "bike", "walk", "transition"]);
    expect(SPORTS.filter((s) => !sportHasGps(s))).toEqual(["strength", "rowing_indoor", "treadmill", "swimming_pool"]);
    for (const sport of SPORTS) expect(sportHasGps(sport)).toBe(SPORT_HAS_GPS[sport]);
  });

  it("nextSport cycles through all eight and wraps", () => {
    expect(nextSport("run")).toBe("bike");
    expect(nextSport("bike")).toBe("walk");
    expect(nextSport("walk")).toBe("transition");
    expect(nextSport("transition")).toBe("strength");
    expect(nextSport("strength")).toBe("rowing_indoor");
    expect(nextSport("rowing_indoor")).toBe("treadmill");
    expect(nextSport("treadmill")).toBe("swimming_pool");
    expect(nextSport("swimming_pool")).toBe("run");
  });

  it("the simulator does not move for a sport without GPS", () => {
    const start = createSim();
    for (const sport of ["strength", "rowing_indoor", "treadmill", "swimming_pool"] as const) {
      const next = stepSim(start, sport, 60_000, () => 0.5);
      expect(haversineMeters(start, next)).toBeCloseTo(0, 6);
      expect(sampleFromSim(next, sport, 1).speedMps).toBe(0);
    }
  });
});

describe("createSim", () => {
  it("starts in Lisbon with a fixed heading by default", () => {
    expect(createSim()).toEqual({ lat: LISBON.lat, lng: LISBON.lng, heading: Math.PI * 0.15 });
  });

  it("accepts a custom origin", () => {
    const sim = createSim({ lat: 41.1579, lng: -8.6291 });
    expect(sim.lat).toBe(41.1579);
    expect(sim.lng).toBe(-8.6291);
  });
});

describe("stepSim", () => {
  it("moves speed × dt metres when the rng yields no jitter", () => {
    const start = createSim();
    for (const sport of SPORTS) {
      const next = stepSim(start, sport, 1_000, () => 0.5);
      expect(haversineMeters(start, next)).toBeCloseTo(typicalSpeed(sport), 3);
      expect(next.heading).toBe(start.heading);
    }
  });

  it("scales with dt", () => {
    const start = createSim();
    const next = stepSim(start, "bike", 2_500, () => 0.5);
    expect(haversineMeters(start, next)).toBeCloseTo(typicalSpeed("bike") * 2.5, 3);
  });

  it("jitters the heading by at most ±0.09 rad", () => {
    const start = createSim();
    expect(stepSim(start, "run", 1_000, () => 1).heading).toBeCloseTo(start.heading + 0.09, 9);
    expect(stepSim(start, "run", 1_000, () => 0).heading).toBeCloseTo(start.heading - 0.09, 9);
  });

  it("does not mutate the input state and uses Math.random by default", () => {
    const start = createSim();
    const snapshot = { ...start };
    const next = stepSim(start, "walk", 1_000);
    expect(start).toEqual(snapshot);
    expect(Math.abs(next.heading - start.heading)).toBeLessThanOrEqual(0.09 + 1e-9);
    expect(haversineMeters(start, next)).toBeCloseTo(typicalSpeed("walk"), 3);
  });

  it("dt = 0 stays in place; a negative dt (clock stepped back) also stays in place", () => {
    const start = createSim();
    expect(haversineMeters(start, stepSim(start, "run", 0, () => 0.5))).toBeCloseTo(0, 6);
    expect(haversineMeters(start, stepSim(start, "run", -1_000, () => 0.5))).toBeCloseTo(0, 6);
  });
});

describe("sampleFromSim", () => {
  it("copies position, stamps the sport's typical speed and source 'sim'", () => {
    const sim = { lat: 1, lng: 2, heading: 0 };
    expect(sampleFromSim(sim, "bike", 123)).toEqual({
      t: 123,
      lat: 1,
      lng: 2,
      speedMps: typicalSpeed("bike"),
      source: "sim",
    });
  });
});

describe("sampleFromGps", () => {
  it("maps latitude/longitude and keeps a positive speed", () => {
    expect(sampleFromGps({ latitude: 38.7, longitude: -9.1, speed: 2.5 }, 10)).toEqual({
      t: 10,
      lat: 38.7,
      lng: -9.1,
      speedMps: 2.5,
      source: "gps",
    });
  });

  it("treats null, missing, zero and negative speed as 0", () => {
    expect(sampleFromGps({ latitude: 0, longitude: 0, speed: null }, 1).speedMps).toBe(0);
    expect(sampleFromGps({ latitude: 0, longitude: 0 }, 1).speedMps).toBe(0);
    expect(sampleFromGps({ latitude: 0, longitude: 0, speed: 0 }, 1).speedMps).toBe(0);
    expect(sampleFromGps({ latitude: 0, longitude: 0, speed: -1 }, 1).speedMps).toBe(0);
  });
});
