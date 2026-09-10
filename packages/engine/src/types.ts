/**
 * Every sport a segment can be. Outdoor sports are recorded with a position
 * feed; the gym and pool ones are time only (ADR 0008). Order is the order
 * the pickers show them in.
 */
export const SPORTS = [
  "run",
  "bike",
  "walk",
  "transition",
  "strength",
  "rowing_indoor",
  "treadmill",
  "swimming_pool",
] as const;

export type Sport = (typeof SPORTS)[number];

/**
 * Whether a sport is recorded with a position feed. A segment of a sport
 * without one has no samples on purpose: its distance is 0 and it has no
 * pace or speed, whatever samples may sit around it in time.
 */
export const SPORT_HAS_GPS: Record<Sport, boolean> = {
  run: true,
  bike: true,
  walk: true,
  transition: true,
  strength: false,
  rowing_indoor: false,
  treadmill: false,
  swimming_pool: false,
};

export function sportHasGps(sport: Sport): boolean {
  return SPORT_HAS_GPS[sport];
}

export function nextSport(current: Sport): Sport {
  const i = SPORTS.indexOf(current);
  return SPORTS[(i + 1) % SPORTS.length]!;
}

export type SessionEvent =
  | { type: "started"; at: number; sport: Sport }
  | { type: "sport_changed"; at: number; sport: Sport }
  | { type: "stopped"; at: number }
  | { type: "recovered"; at: number };

export type Sample = {
  t: number;
  lat: number;
  lng: number;
  speedMps: number;
  source: "sim" | "gps";
};

/**
 * Minimal structural shape of a GPS fix. Matches the browser's
 * `GeolocationCoordinates` and Expo's `LocationObjectCoords` without importing
 * either, so the engine stays platform-free.
 */
export type GpsCoords = {
  latitude: number;
  longitude: number;
  speed?: number | null;
};

export type SessionStatus = "live" | "stopped";

export type Session = {
  id: string;
  createdAt: number;
  status: SessionStatus;
  events: SessionEvent[];
  samples: Sample[];
};

export type Segment = {
  index: number;
  sport: Sport;
  startAt: number;
  endAt: number | null;
  sampleStart: number;
  sampleEnd: number;
};

export type SegmentMetrics = {
  durationMs: number;
  distanceM: number;
  avgSpeedMps: number;
};

export type PaceKind = "pace" | "speed" | "none";

/**
 * Which split makes sense for each sport: a running/walking pace (min/km), a
 * cycling speed (km/h), or neither (a transition has no meaningful rate).
 * This is domain logic, not UI copy — display labels for each `Sport` live
 * in `@bricklap/i18n` (keyed by the `Sport` string itself), not here. The
 * engine stays free of any language-specific text.
 */
export const SPORT_PACE_KIND: Record<Sport, PaceKind> = {
  run: "pace",
  bike: "speed",
  walk: "pace",
  transition: "none",
  strength: "none",
  rowing_indoor: "none",
  treadmill: "none",
  swimming_pool: "none",
};

/** Simulated ground speed. Sports without a position feed never move. */
export const SIM_SPEED_MPS: Record<Sport, number> = {
  run: 3.15,
  bike: 7.4,
  walk: 1.45,
  transition: 0.7,
  strength: 0,
  rowing_indoor: 0,
  treadmill: 0,
  swimming_pool: 0,
};
