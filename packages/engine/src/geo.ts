import { destination, typicalSpeed } from "./engine";
import type { Sample, Sport } from "./types";

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

export function stepSim(state: SimState, sport: Sport, dtMs: number): SimState {
  const speed = typicalSpeed(sport);
  const jitter = (Math.random() - 0.5) * 0.18;
  const heading = state.heading + jitter;
  const meters = speed * (dtMs / 1000);
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

export function sampleFromGps(
  coords: GeolocationCoordinates,
  t: number,
): Sample {
  return {
    t,
    lat: coords.latitude,
    lng: coords.longitude,
    speedMps: coords.speed && coords.speed > 0 ? coords.speed : 0,
    source: "gps",
  };
}
