import { destination } from "./engine";
import { LISBON } from "./geo";
import type { Sample, Session, Sport } from "./types";
import { SIM_SPEED_MPS } from "./types";

type Leg = { sport: Sport; durationMs: number };

const SEED_BRICK_AT = Date.UTC(2026, 8, 6, 7, 12, 0);
const SEED_EASY_AT = Date.UTC(2026, 8, 4, 18, 40, 0);

function synthTrack(legs: Leg[], startAt: number, origin = LISBON): Sample[] {
  const samples: Sample[] = [];
  let lat = origin.lat;
  let lng = origin.lng;
  let heading = 0.4;
  let t = startAt;
  const step = 8000;

  for (const leg of legs) {
    const end = t + leg.durationMs;
    const speed = SIM_SPEED_MPS[leg.sport];
    while (t <= end) {
      samples.push({ t, lat, lng, speedMps: speed, source: "sim" });
      heading += 0.08;
      const next = destination(lat, lng, heading, speed * (step / 1000));
      lat = next.lat;
      lng = next.lng;
      t += step;
    }
  }
  return samples;
}

function sessionFromLegs(startAt: number, legs: Leg[], id: string): Session {
  const events: Session["events"] = [
    { type: "started", at: startAt, sport: legs[0]!.sport },
  ];
  let cursor = startAt;
  for (let i = 1; i < legs.length; i++) {
    cursor += legs[i - 1]!.durationMs;
    events.push({ type: "sport_changed", at: cursor, sport: legs[i]!.sport });
  }
  const lastDur = legs.reduce((s, l) => s + l.durationMs, 0);
  events.push({ type: "stopped", at: startAt + lastDur });
  return {
    id,
    createdAt: startAt,
    status: "stopped",
    events,
    samples: synthTrack(legs, startAt),
  };
}

export function seedSessions(): Session[] {
  return [
    sessionFromLegs(
      SEED_BRICK_AT,
      [
        { sport: "run", durationMs: 38 * 60 * 1000 + 21 * 1000 },
        { sport: "bike", durationMs: 41 * 60 * 1000 + 7 * 1000 },
        { sport: "run", durationMs: 22 * 60 * 1000 + 50 * 1000 },
      ],
      "seed-brick",
    ),
    sessionFromLegs(
      SEED_EASY_AT,
      [
        { sport: "walk", durationMs: 12 * 60 * 1000 },
        { sport: "run", durationMs: 18 * 60 * 1000 + 40 * 1000 },
        { sport: "walk", durationMs: 6 * 60 * 1000 + 12 * 1000 },
      ],
      "seed-easy",
    ),
  ];
}
