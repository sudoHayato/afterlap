import * as Location from "expo-location";
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { sampleFromGps } from "@bricklap/engine";
import { getStore } from "../store";
import { diag, diagBattery } from "./diag";
import { appendRawFix, rawFixLine } from "./rawLog";

/**
 * Background recording (ADR 0010): a location task with a foreground service
 * and a persistent notification — the only recording path since session 08.
 * Fixes reach the task through expo-task-manager (Android's JobScheduler →
 * TaskJobService → the app's live JS context when it is alive, a headless
 * one when it is not) and the task writes them straight into the SQLite
 * store: same table, same events, same engine. The screen only ever reads
 * the store.
 *
 * Consequences of that path, learnt from the native code and the field:
 * - A fix can arrive seconds after it was taken (job scheduling; 4 s at the
 *   desk on the cable, 50 ms in the pocket), so the sample's `t` is the
 *   fix's own timestamp, not the arrival clock. Events keep the user's
 *   clock; the boundary sample at CHANGE/STOP is the newest fix stamped at
 *   the event, as before.
 * - With the process dead there is no React tree and no store in memory:
 *   the task hydrates the store itself — which appends a `recovered` event
 *   marked as headless (`recovered_headless` on disk) so the row tells a
 *   revival by Android from the athlete reopening the app — and stops the
 *   updates if nothing is live any more.
 * - The notification text is part of the task's options: changing it means
 *   `startLocationUpdatesAsync` again, which the native consumer turns into
 *   "restart the location request, keep the service, rebuild the
 *   notification". Cheap enough at START, CHANGE and resume; never per
 *   second. The elapsed time it shows is therefore the one at the last of
 *   those moments, with the clock of that moment next to it.
 *
 * Permissions: ACCESS_FINE_LOCATION (foreground) plus FOREGROUND_SERVICE,
 * FOREGROUND_SERVICE_LOCATION and RECEIVE_BOOT_COMPLETED (persisted jobs)
 * in the manifest. No ACCESS_BACKGROUND_LOCATION: expo-location only
 * demands it when no `foregroundService` is given.
 *
 * Every start/stop/refresh goes through one promise queue: the calls are
 * async native round-trips and a stop that lands after the start that
 * replaced it would kill the new recording.
 */
export const LOCATION_TASK = "bricklap-recording";

export type RecordingNotification = { title: string; body: string };

let latest: LocationObject | null = null;
let batches = 0;
let lastBatchAt = 0;
/** Text last handed to the service from this JS context; null until this context started it. */
let notification: RecordingNotification | null = null;
let queue: Promise<void> = Promise.resolve();

/** Newest fix the task has seen in this JS context (for the boundary sample and the GPS line). */
export function latestLocation(): LocationObject | null {
  return latest;
}

/** Serialise the native calls; a failure in one never blocks the next. */
function enqueue(op: () => Promise<void>): Promise<void> {
  const run = queue.then(op);
  queue = run.catch(() => undefined);
  return run;
}

type TaskData = { locations?: LocationObject[] };

/**
 * Must run at module load, before any React code, in every JS context —
 * `index.ts` imports this file first. A task defined later than the first
 * job that names it is dropped by the task manager.
 */
export function defineRecordingTask(): void {
  TaskManager.defineTask<TaskData>(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      diag("task_error", { message: error.message });
      return;
    }
    const locations = data?.locations ?? [];
    if (locations.length === 0) return;

    const store = getStore();
    if (!store.live()) {
      // Headless start: the process died and Android woke us for this batch.
      const live = store.hydrate(undefined, "headless");
      diag("headless_hydrate", { liveId: live?.id ?? null, samples: live?.samples.length ?? null });
      if (!live) {
        // Nothing is recording any more; a zombie service would only burn battery.
        await stopBackgroundRecording("no live session");
        return;
      }
    }

    const arrivedAt = Date.now();
    const startedAt = store.live()!.createdAt;
    for (const loc of locations) {
      // The fused provider may hand over its last known position first, with
      // the timestamp of when it was taken — minutes before this session, and
      // wherever the phone was then (410 s old in the session 08 device
      // test). With `t` = the fix's own time it would open the session with
      // a false gap and pull the first leg towards that old place.
      if (loc.timestamp < startedAt) continue;
      const sample = sampleFromGps(loc.coords, loc.timestamp);
      store.pushSample(sample);
      const live = store.live();
      if (live) appendRawFix(rawFixLine(live.id, sample.t, arrivedAt, loc));
    }
    // Write the batch now, not on the store's 2 s timer. In a process Android
    // revived for this job, expo-task-manager tears the whole React context
    // down 2 s after the task resolves — measured on the phone in session 08:
    // the timer lost that race on every batch and 99 s of fixes never reached
    // the disk. One small transaction per batch (≈ 1 per second) is cheap.
    store.flush();
    latest = locations[locations.length - 1]!;
    batches++;
    diag("batch", {
      n: locations.length,
      newestFixAt: latest.timestamp,
      delayMs: arrivedAt - latest.timestamp,
      sinceLastBatchMs: lastBatchAt ? arrivedAt - lastBatchAt : null,
      accuracyM: latest.coords.accuracy,
      samplesInSession: store.live()?.samples.length ?? null,
    });
    lastBatchAt = arrivedAt;
    await diagBattery();
  });
}

export async function isBackgroundRecording(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

function taskOptions(n: RecordingNotification): Location.LocationTaskOptions {
  return {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    // Deliver every fix as soon as it exists, foreground or not: in the
    // pocket that costs nothing measurable (session 07 field test).
    deferredUpdatesInterval: 0,
    deferredUpdatesDistance: 0,
    foregroundService: {
      notificationTitle: n.title,
      notificationBody: n.body,
      notificationColor: "#070708",
      // Swiping the app away must not kill the recording.
      killServiceOnDestroy: false,
    },
  };
}

/**
 * Start — or re-arm — the service with this notification text. Must be
 * called with the app in the foreground (Android refuses to start a
 * foreground service otherwise). Re-arming a running task is what makes a
 * resume after a kill work: the task manager refreshes the options, the
 * consumer restarts the location request and the service, if it died with
 * the process, comes back.
 */
export function startBackgroundRecording(n: RecordingNotification): Promise<void> {
  return enqueue(async () => {
    latest = null;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, taskOptions(n));
    notification = n;
    diag("service_start", { task: LOCATION_TASK, title: n.title });
    await diagBattery(true);
  });
}

/**
 * Refresh the notification of a service this JS context started, if the
 * text changed. A no-op before the first start (the start carries the text)
 * and on a context that never started it (the feed effect will).
 */
export function updateRecordingNotification(n: RecordingNotification): Promise<void> {
  return enqueue(async () => {
    if (!notification || (notification.title === n.title && notification.body === n.body)) return;
    if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, taskOptions(n));
    notification = n;
    diag("notification", { title: n.title });
  });
}

export function stopBackgroundRecording(reason: string): Promise<void> {
  return enqueue(async () => {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
      diag("service_stop", { reason, batches });
      await diagBattery(true);
    } catch (e) {
      diag("service_stop", { reason, error: String(e) });
    }
    notification = null;
    latest = null;
  });
}
