import * as Battery from "expo-battery";
import { File, Paths } from "expo-file-system";

/**
 * Instrumentation for the background-recording experiment (session 07).
 * One JSON line per event, both to logcat (`BRICKLAP_BG …`) and to
 * `files/bg-diag.jsonl`, which survives logcat's ring buffer and a dead
 * process. Never throws into the recording path. Written in release builds
 * too: the field test runs on the release APK.
 *
 * Events: `service_start`, `service_stop`, `batch` (fixes delivered to the
 * task, with the delay between the newest fix and its arrival), `battery`
 * (level and charging state, at most once a minute), `task_error`,
 * `headless_hydrate` (the task woke up without a live session in memory).
 */
export const DIAG_LOG_NAME = "bg-diag.jsonl";

export type DiagLine = { kind: string; at: number } & Record<string, unknown>;

let file: File | null = null;

export function diag(kind: string, fields: Record<string, unknown> = {}): void {
  const line: DiagLine = { kind, at: Date.now(), ...fields };
  const text = JSON.stringify(line);
  console.log(`BRICKLAP_BG ${text}`);
  try {
    file ??= new File(Paths.document, DIAG_LOG_NAME);
    if (!file.exists) file.create();
    const handle = file.open();
    handle.offset = handle.size ?? 0;
    handle.writeBytes(new TextEncoder().encode(text + "\n"));
    handle.close();
  } catch (e) {
    console.warn("BRICKLAP_BG_DIAG", e);
  }
}

const BATTERY_EVERY_MS = 60_000;
let lastBatteryAt = 0;

/** Log the battery level, but at most once per minute; `force` ignores the throttle. */
export async function diagBattery(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastBatteryAt < BATTERY_EVERY_MS) return;
  lastBatteryAt = now;
  try {
    const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
    diag("battery", { levelPct: Math.round(level * 100), state: Battery.BatteryState[state] ?? String(state) });
  } catch (e) {
    diag("battery", { error: String(e) });
  }
}
