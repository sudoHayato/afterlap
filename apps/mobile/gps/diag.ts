import * as Battery from "expo-battery";
import { DevJsonlLog } from "./devLog";

/**
 * Diagnostics of the background recording (ADR 0010). One JSON line per
 * event, both to logcat (`BRICKLAP_BG …`) and to `files/bg-diag.jsonl`,
 * which survives logcat's ring buffer and a dead process. **Development
 * builds only**, rotated per session like the raw GPS log (`bg-diag.prev.jsonl`
 * keeps the session before); a release build logs nothing and costs nothing.
 * Never throws into the recording path.
 *
 * Events: `service_start`, `service_stop`, `notification` (text refreshed on
 * a running service), `batch` (fixes delivered to the task, with the delay
 * between the newest fix and its arrival), `battery` (level and charging
 * state, at most once a minute), `task_error`, `headless_hydrate` (the task
 * woke up without a live session in memory: the process had died).
 *
 * The session 07 field test (relatório §8) was read from this file on a
 * release build; since session 08 a release field test is read from the
 * database alone — gaps, samples, `recovered_headless` rows — and the
 * battery level is noted by the athlete.
 */
export const DIAG_LOG_NAME = "bg-diag.jsonl";
export const DIAG_LOG_PREV_NAME = "bg-diag.prev.jsonl";

export type DiagLine = { kind: string; at: number } & Record<string, unknown>;

const log = new DevJsonlLog(DIAG_LOG_NAME, DIAG_LOG_PREV_NAME, "BRICKLAP_BG_DIAG");

/** Start a fresh diagnostics file for a new session, keeping the previous one as `.prev`. Dev only. */
export function rotateDiagLog(): void {
  log.rotate();
}

export function diag(kind: string, fields: Record<string, unknown> = {}): void {
  if (!__DEV__) return;
  const line: DiagLine = { kind, at: Date.now(), ...fields };
  console.log(`BRICKLAP_BG ${JSON.stringify(line)}`);
  log.append(line);
}

const BATTERY_EVERY_MS = 60_000;
let lastBatteryAt = 0;

/** Log the battery level, but at most once per minute; `force` ignores the throttle. Dev only. */
export async function diagBattery(force = false): Promise<void> {
  if (!__DEV__) return;
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
