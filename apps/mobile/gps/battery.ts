import * as Battery from "expo-battery";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking } from "react-native";

/**
 * Battery optimisation exemption (session 07). Android and, more
 * aggressively, One UI put a backgrounded app "to sleep" and throttle its
 * services; the founder accepted asking the athlete for the exemption. The
 * app explains and opens the system dialog — it never tries to work around
 * the setting.
 *
 * Detection: PowerManager.isIgnoringBatteryOptimizations, through
 * expo-battery. Request: the ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 * intent with `package:<id>` as data, which on this phone (Android 16,
 * One UI 8.5) resolves to the system's own yes/no dialog for the app; it
 * needs the REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission in the manifest
 * (declared in app.json). The Samsung-specific "sleeping apps" screen has
 * no resolvable intent on One UI 8.5 (`com.samsung.android.sm.ACTION_BATTERY`
 * finds no activity), so the fallback is the app's own details page.
 */
export const APP_ID = "com.bricklap.app";

export async function isBatteryOptimised(): Promise<boolean> {
  try {
    return await Battery.isBatteryOptimizationEnabledAsync();
  } catch {
    return false;
  }
}

export async function requestBatteryExemption(): Promise<void> {
  try {
    await IntentLauncher.startActivityAsync("android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", {
      data: `package:${APP_ID}`,
    });
  } catch {
    await Linking.openSettings();
  }
}
