import type { SqliteSessionStore, WriteTiming } from "./persistence";
import { openSessionStore } from "./persistence/expo";

/**
 * One store per process, opened on first use. In development every write
 * timing and the boot-time replay go to the console as single JSON lines
 * (BRICKLAP_TIMING, BRICKLAP_RECOVERY) so `adb logcat` can collect them —
 * that is how the session 03 measurements and the device recovery test read
 * the app's side of the story.
 */
let instance: SqliteSessionStore | null = null;

export function getStore(): SqliteSessionStore {
  if (!instance) {
    instance = openSessionStore({ onTiming: __DEV__ ? logTiming : undefined });
  }
  return instance;
}

function logTiming(t: WriteTiming): void {
  console.log(`BRICKLAP_TIMING ${JSON.stringify(t)}`);
}

export function logRecovery(summary: Record<string, unknown>): void {
  if (__DEV__) console.log(`BRICKLAP_RECOVERY ${JSON.stringify(summary)}`);
}
