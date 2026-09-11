import * as Location from "expo-location";
import type { LocationObject } from "expo-location";

/**
 * Location permission and fix quality. The recording itself lives in
 * ./background (a location task with a foreground service, ADR 0010);
 * the foreground watcher of ADR 0007 is gone — one recording path only.
 * Still only ACCESS_FINE_LOCATION: the foreground service does not need
 * the background location permission.
 */

/** Above this the fix is kept but marked as weak; the engine already drops jumps > 55 m/s. */
export const WEAK_ACCURACY_M = 30;

export type Fix = LocationObject;

export type PermissionOutcome = "granted" | "denied" | "blocked" | "services_off";

/** Asks the system for foreground location. "blocked" means the OS will not show the dialog again. */
export async function requestForegroundLocation(): Promise<PermissionOutcome> {
  const res = await Location.requestForegroundPermissionsAsync();
  if (!res.granted) return res.canAskAgain ? "denied" : "blocked";
  if (!(await Location.hasServicesEnabledAsync())) return "services_off";
  return "granted";
}

export function isWeak(fix: Fix): boolean {
  const acc = fix.coords.accuracy;
  return acc === null || acc > WEAK_ACCURACY_M;
}
