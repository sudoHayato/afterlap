import * as Location from "expo-location";
import type { LocationObject } from "expo-location";

/**
 * Foreground GPS only (ADR 0007): ACCESS_FINE_LOCATION, no background
 * permission, no foreground service — those are Fase 3. This file is the
 * only place that talks to expo-location; App.tsx sees fixes and outcomes.
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

/**
 * 1 Hz, best accuracy the device offers, every fix delivered (no distance
 * gate: standing still must still produce samples). Resolves to a function
 * that stops the watch.
 */
export async function watchFixes(
  onFix: (fix: Fix) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      mayShowUserSettingsDialog: true,
    },
    onFix,
    onError,
  );
  return () => sub.remove();
}

export function isWeak(fix: Fix): boolean {
  const acc = fix.coords.accuracy;
  return acc === null || acc > WEAK_ACCURACY_M;
}
