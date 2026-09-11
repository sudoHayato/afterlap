import { SPORTS, type Sample, type Session, type SessionEvent, type Sport } from "@bricklap/engine";

/** One row of `events`, as SELECTed. */
export type EventRow = {
  seq: number;
  session_id: string;
  type: string;
  at: number;
  sport: string | null;
  discarded: number;
};

/** One row of `samples`, as SELECTed. */
export type SampleRow = {
  session_id: string;
  t: number;
  lat: number;
  lng: number;
  speed_mps: number;
  source: string;
  /** Metres, or NULL when the fix reported none (and for every row older than schema v2). */
  accuracy: number | null;
};

export type StoredSession = {
  session: Session;
  /** True when the STOP that closed it carried the discard flag. */
  discarded: boolean;
  /** `seq` of the session's first event; orders sessions the way they were written. */
  firstSeq: number;
};

function asSport(value: string | null, seq: number): Sport {
  if (value !== null && (SPORTS as readonly string[]).includes(value)) return value as Sport;
  throw new Error(`events.seq=${seq}: sport ${JSON.stringify(value)} is not one of ${SPORTS.join(", ")}`);
}

/** Rebuild the engine's event from a row. Loud on anything it does not recognise. */
export function eventFromRow(row: EventRow): SessionEvent {
  switch (row.type) {
    case "started":
      return { type: "started", at: row.at, sport: asSport(row.sport, row.seq) };
    case "sport_changed":
      return { type: "sport_changed", at: row.at, sport: asSport(row.sport, row.seq) };
    case "stopped":
      return { type: "stopped", at: row.at };
    case "recovered":
      return { type: "recovered", at: row.at };
    default:
      throw new Error(`events.seq=${row.seq}: unknown type ${JSON.stringify(row.type)}`);
  }
}

export function sampleFromRow(row: SampleRow): Sample {
  if (row.source !== "sim" && row.source !== "gps") {
    throw new Error(`samples: unknown source ${JSON.stringify(row.source)}`);
  }
  return {
    t: row.t,
    lat: row.lat,
    lng: row.lng,
    speedMps: row.speed_mps,
    source: row.source,
    // Absent, not null, when unknown: the replayed sample must equal the one
    // the engine built in memory, which never carries a null accuracy.
    ...(row.accuracy === null ? {} : { accuracyM: row.accuracy }),
  };
}

/**
 * Sessions from rows. Pure: the same function serves the app at boot and the
 * recovery test on a database pulled off the phone. Rows must already be in
 * `seq` order (both SELECTs in the repository order by it).
 *
 * Status is derived, never stored: a session with a `stopped` event is
 * stopped, any other is live. `createdAt` is the `at` of its `started` event.
 */
export function replaySessions(events: readonly EventRow[], samples: readonly SampleRow[]): StoredSession[] {
  const byId = new Map<string, StoredSession>();

  for (const row of events) {
    const event = eventFromRow(row);
    let stored = byId.get(row.session_id);
    if (!stored) {
      if (event.type !== "started") {
        throw new Error(`events.seq=${row.seq}: session ${row.session_id} begins with ${event.type}, not started`);
      }
      stored = {
        session: { id: row.session_id, createdAt: event.at, status: "live", events: [], samples: [] },
        discarded: false,
        firstSeq: row.seq,
      };
      byId.set(row.session_id, stored);
    }
    stored.session.events.push(event);
    if (event.type === "stopped") {
      stored.session.status = "stopped";
      if (row.discarded !== 0) stored.discarded = true;
    }
  }

  for (const row of samples) {
    const stored = byId.get(row.session_id);
    // A sample whose session has no events is an orphan; keeping it would
    // invent a session. Skip it rather than fail the whole replay.
    if (!stored) continue;
    stored.session.samples.push(sampleFromRow(row));
  }

  return [...byId.values()].sort((a, b) => a.firstSeq - b.firstSeq);
}
