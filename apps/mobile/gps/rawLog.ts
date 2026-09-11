import { DevJsonlLog } from "./devLog";
import { isWeak, type Fix } from "./location";

/**
 * Raw GPS log, one JSON line per fix, next to the SQLite database in the
 * app's files/ directory. Since ADR 0009 the database itself keeps each
 * fix's accuracy; this file is what is left of the raw fix — altitude,
 * heading, the provider's Doppler speed, `mocked` — and it exists **only in
 * development builds** (`__DEV__`): a release build writes nothing here.
 * Since ADR 0010 the background task writes it, fix by fix, in the same
 * order it pushes samples to the store.
 *
 * Rotation per session: when a session starts, the current log becomes
 * `gps-raw.prev.jsonl` (replacing the one before) and a fresh log begins.
 * At most two sessions of raw fixes live on disk, ~230 bytes per fix.
 *
 * Pull it with `adb exec-out run-as com.bricklap.app cat files/gps-raw.jsonl`
 * (a debuggable build), or with the export button in the history screen.
 */
export const RAW_LOG_NAME = "gps-raw.jsonl";
export const RAW_LOG_PREV_NAME = "gps-raw.prev.jsonl";

export type RawFixLine = {
  session: string;
  /** The sample's `t`: since ADR 0010 the fix's own timestamp, not the arrival clock. */
  t: number;
  /** App clock when the task received the fix; `t` plus the delivery delay. */
  arrivedAt: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedMps: number | null;
  altitudeM: number | null;
  headingDeg: number | null;
  mocked: boolean;
  weak: boolean;
};

export function rawFixLine(session: string, t: number, arrivedAt: number, fix: Fix): RawFixLine {
  const c = fix.coords;
  return {
    session,
    t,
    arrivedAt,
    lat: c.latitude,
    lng: c.longitude,
    accuracyM: c.accuracy,
    speedMps: c.speed,
    altitudeM: c.altitude,
    headingDeg: c.heading,
    mocked: fix.mocked === true,
    weak: isWeak(fix),
  };
}

const log = new DevJsonlLog(RAW_LOG_NAME, RAW_LOG_PREV_NAME, "BRICKLAP_RAWLOG");

/** Start a fresh log for a new session, keeping the previous session's as `.prev`. Dev only. */
export function rotateRawLog(): void {
  log.rotate();
}

export function appendRawFix(line: RawFixLine): void {
  log.append(line);
}
