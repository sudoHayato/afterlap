import { destination, typicalSpeed } from "./engine";
import type { GpsCoords, Sample, Sport } from "./types";

export const LISBON = { lat: 38.7223, lng: -9.1393 };

export type SimState = {
  lat: number;
  lng: number;
  heading: number;
};

export function createSim(origin = LISBON): SimState {
  return {
    lat: origin.lat,
    lng: origin.lng,
    heading: Math.PI * 0.15,
  };
}

/**
 * Advance the simulated walker by `dtMs` at the sport's typical speed with a
 * small heading jitter. `rng` is injectable so tests are deterministic.
 */
export function stepSim(
  state: SimState,
  sport: Sport,
  dtMs: number,
  rng: () => number = Math.random,
): SimState {
  const speed = typicalSpeed(sport);
  const jitter = (rng() - 0.5) * 0.18;
  const heading = state.heading + jitter;
  // A clock that steps backwards must not walk the simulation backwards.
  const meters = speed * (Math.max(0, dtMs) / 1000);
  const next = destination(state.lat, state.lng, heading, meters);
  return { lat: next.lat, lng: next.lng, heading };
}

export function sampleFromSim(
  state: SimState,
  sport: Sport,
  t: number,
): Sample {
  return {
    t,
    lat: state.lat,
    lng: state.lng,
    speedMps: typicalSpeed(sport),
    source: "sim",
  };
}

export function sampleFromGps(coords: GpsCoords, t: number): Sample {
  const speed = coords.speed ?? 0;
  return {
    t,
    lat: coords.latitude,
    lng: coords.longitude,
    speedMps: speed > 0 ? speed : 0,
    source: "gps",
  };
}
