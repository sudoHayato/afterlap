import { File, Paths } from "expo-file-system";
import { isWeak, type Fix } from "./location";

/**
 * Raw GPS log, one JSON line per fix, next to the SQLite database in the
 * app's files/ directory. The database keeps every fix as a plain `gps`
 * sample (ADR 0006 is closed); this file is where the raw data lives —
 * accuracy, altitude, heading, the fix's own timestamp, and the `weak` mark
 * for accuracy > WEAK_ACCURACY_M — so filters can be decided on real numbers
 * in Fase 3. Debug only: it never throws into the recording path.
 *
 * Pull it with `adb exec-out run-as com.bricklap.app cat files/gps-raw.jsonl`.
 */
export const RAW_LOG_NAME = "gps-raw.jsonl";

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

export function appendRawFix(line: RawFixLine): void {
  try {
    file ??= new File(Paths.document, RAW_LOG_NAME);
    if (!file.exists) file.create();
    const handle = file.open();
    handle.offset = handle.size ?? 0;
    handle.writeBytes(new TextEncoder().encode(JSON.stringify(line) + "\n"));
    handle.close();
  } catch (e) {
    if (__DEV__) console.warn("BRICKLAP_RAWLOG", e);
  }
}
