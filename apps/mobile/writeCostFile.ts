import { File, Paths } from "expo-file-system";
import type { WriteTiming } from "./persistence";
import { addWriteTiming, emptyWriteCost, parseWriteCost, type WriteCost } from "./persistence/writeCost";

/**
 * The write-cost summary on disk (`files/write-cost.json`), in release builds
 * too — the 2-hour field test runs on the release APK (decision of the CTO,
 * session 08). Rotated per session like the dev logs (`write-cost.prev.json`
 * keeps the session before). Never throws into the recording path.
 *
 * Each JS context reads the file on its first write and saves at most every
 * 30 s. A context Android revived for the background task lives 2 s, so it
 * saves on its first write and may lose the few after it — a measurement,
 * not data: the samples themselves are in the database.
 *
 * Read it with a debuggable build installed over the release (app README):
 * `adb exec-out run-as com.bricklap.app cat files/write-cost.json`.
 */
export const WRITE_COST_NAME = "write-cost.json";
export const WRITE_COST_PREV_NAME = "write-cost.prev.json";
const SAVE_EVERY_MS = 30_000;

let cost: WriteCost | null = null;
let lastSavedAt = 0;

function file(name: string): File {
  return new File(Paths.document, name);
}

function load(now: number): WriteCost {
  const f = file(WRITE_COST_NAME);
  return (f.exists && parseWriteCost(f.textSync())) || emptyWriteCost(now);
}

function save(now: number): void {
  if (!cost) return;
  const f = file(WRITE_COST_NAME);
  if (!f.exists) f.create();
  f.write(JSON.stringify(cost));
  lastSavedAt = now;
}

export function recordWriteCost(t: WriteTiming): void {
  try {
    const now = Date.now();
    cost = addWriteTiming(cost ?? load(now), t, now);
    if (now - lastSavedAt >= SAVE_EVERY_MS) save(now);
  } catch (e) {
    console.warn("BRICKLAP_WRITE_COST", e);
  }
}

/** A new session, a new summary; the previous one becomes `.prev`. */
export function rotateWriteCost(): void {
  try {
    const now = Date.now();
    const current = file(WRITE_COST_NAME);
    if (current.exists) {
      const previous = file(WRITE_COST_PREV_NAME);
      if (previous.exists) previous.delete();
      current.moveSync(previous);
    }
    cost = emptyWriteCost(now);
    save(now);
  } catch (e) {
    console.warn("BRICKLAP_WRITE_COST", e);
  }
}
