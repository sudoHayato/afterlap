export const SPORTS = ["run", "bike", "walk", "transition"] as const;

export type Sport = (typeof SPORTS)[number];

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

export const SPORT_META: Record<
  Sport,
  { label: string; live: string; paceKind: "pace" | "speed" | "none" }
> = {
  run: { label: "Run", live: "Running", paceKind: "pace" },
  bike: { label: "Bike", live: "Riding", paceKind: "speed" },
  walk: { label: "Walk", live: "Walking", paceKind: "pace" },
  transition: { label: "Transition", live: "Transition", paceKind: "none" },
};

export const SIM_SPEED_MPS: Record<Sport, number> = {
  run: 3.15,
  bike: 7.4,
  walk: 1.45,
  transition: 0.7,
};
