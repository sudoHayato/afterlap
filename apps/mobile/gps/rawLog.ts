import { File, Paths } from "expo-file-system";
import { isWeak, type Fix } from "./location";

/**
 * Raw GPS log, one JSON line per fix, next to the SQLite database in the
 * app's files/ directory. Since ADR 0009 the database itself keeps each
 * fix's accuracy; this file is what is left of the raw fix — altitude,
 * heading, the provider's own timestamp, `mocked` — and it exists **only in
 * development builds** (`__DEV__`): a release build writes nothing here.
 *
 * Rotation per session: when a session starts, the current log becomes
 * `gps-raw.prev.jsonl` (replacing the one before) and a fresh log begins.
 * At most two sessions of raw fixes live on disk, ~230 bytes per fix.
 * Never throws into the recording path.
 *
 * Pull it with `adb exec-out run-as com.bricklap.app cat files/gps-raw.jsonl`
 * (a debug build), or with the export button in the history screen.
 */
export const RAW_LOG_NAME = "gps-raw.jsonl";
export const RAW_LOG_PREV_NAME = "gps-raw.prev.jsonl";

export type RawFixLine = {
  session: string;
  /** App clock when the fix arrived; matches the sample's `t`. */
  t: number;
  /** The fix's own timestamp, as reported by the provider. */
  fixAt: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  speedMps: number | null;
  altitudeM: number | null;
  headingDeg: number | null;
  mocked: boolean;
  weak: boolean;
};

export function rawFixLine(session: string, t: number, fix: Fix): RawFixLine {
  const c = fix.coords;
  return {
    session,
    t,
    fixAt: fix.timestamp,
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

let file: File | null = null;

/** Start a fresh log for a new session, keeping the previous session's as `.prev`. Dev only. */
export function rotateRawLog(): void {
  if (!__DEV__) return;
  try {
    const current = new File(Paths.document, RAW_LOG_NAME);
    file = null;
    if (!current.exists) return;
    const previous = new File(Paths.document, RAW_LOG_PREV_NAME);
    if (previous.exists) previous.delete();
    current.moveSync(previous);
  } catch (e) {
    console.warn("BRICKLAP_RAWLOG", e);
  }
}

export function appendRawFix(line: RawFixLine): void {
  if (!__DEV__) return;
  try {
    file ??= new File(Paths.document, RAW_LOG_NAME);
    if (!file.exists) file.create();
    const handle = file.open();
    handle.offset = handle.size ?? 0;
    handle.writeBytes(new TextEncoder().encode(JSON.stringify(line) + "\n"));
    handle.close();
  } catch (e) {
    console.warn("BRICKLAP_RAWLOG", e);
  }
}
