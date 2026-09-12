import { PermissionsAndroid, Platform } from "react-native";

/**
 * Notification permission (Android 13+, session 08). The recording service's
 * persistent notification is only shown when the app holds POST_NOTIFICATIONS;
 * without it Android still runs the foreground service but posts nothing to
 * the notification shade — the athlete has no way to see that a session is
 * recording, or to check it mid-workout, with the screen off. Found on the
 * phone in session 08: the permission had never been declared nor asked for,
 * and no notification had ever been visible.
 *
 * Decisions (CTO, session 08): asked for at app start; a refusal does not
 * block recording — the app records anyway and warns, like the battery
 * exemption. Through React Native's own PermissionsAndroid: no dependency.
 * Declared in app.json (`android.permissions`).
 */
export type NotificationPermission = "granted" | "denied" | "blocked";

const PERMISSION = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

/** Below Android 13 (API 33) notifications need no runtime permission. */
function needsRuntimePermission(): boolean {
  return Platform.OS === "android" && Number(Platform.Version) >= 33;
}

/** True when the recording notification can be shown. Never shows a dialog. */
export async function notificationsAllowed(): Promise<boolean> {
  if (!needsRuntimePermission()) return true;
  try {
    return await PermissionsAndroid.check(PERMISSION);
  } catch {
    return false;
  }
}

/**
 * Show the system dialog if Android still allows it. "blocked" means it will
 * not be shown again: only the system settings can grant it now.
 */
export async function requestNotifications(): Promise<NotificationPermission> {
  if (!needsRuntimePermission()) return "granted";
  try {
    const result = await PermissionsAndroid.request(PERMISSION);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
    return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
  } catch {
    return "denied";
  }
}
