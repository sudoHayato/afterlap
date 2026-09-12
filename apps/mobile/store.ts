import type { SqliteSessionStore, WriteTiming } from "./persistence";
import { openSessionStore } from "./persistence/expo";
import { recordWriteCost } from "./writeCostFile";

/**
 * One store per JS context, opened on first use. Every write timing goes to
 * the write-cost summary (`files/write-cost.json`, release too — the CTO
 * wants the per-batch write cost measured in the 2-hour field test). In
 * development each timing and the boot-time replay also go to the console as
 * single JSON lines (BRICKLAP_TIMING, BRICKLAP_RECOVERY) so `adb logcat` can
 * collect them — that is how the session 03 measurements and the device
 * recovery test read the app's side of the story.
 */
let instance: SqliteSessionStore | null = null;

export function getStore(): SqliteSessionStore {
  if (!instance) {
    instance = openSessionStore({ onTiming });
  }
  return instance;
}

function onTiming(t: WriteTiming): void {
  if (__DEV__) console.log(`BRICKLAP_TIMING ${JSON.stringify(t)}`);
  recordWriteCost(t);
}

export function logRecovery(summary: Record<string, unknown>): void {
  if (__DEV__) console.log(`BRICKLAP_RECOVERY ${JSON.stringify(summary)}`);
}
