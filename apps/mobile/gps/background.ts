import * as Location from "expo-location";
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { sampleFromGps } from "@bricklap/engine";
import { getStore } from "../store";
import { diag, diagBattery } from "./diag";

/**
 * Background recording (session 07 experiment, ADR 0010 pending): a location
 * task with a foreground service and a persistent notification, instead of
 * the foreground watcher of ADR 0007. Fixes reach the task through
 * expo-task-manager — through Android's JobScheduler, in the app's live JS
 * context when it is alive and in a headless one when it is not — and the
 * task writes them straight into the SQLite store: same table, same events,
 * same engine. The screen only ever reads the store.
 *
 * Two consequences of that path, learnt from the native code:
 * - A fix can arrive seconds after it was taken (job scheduling, doze), so
 *   the sample's `t` is the fix's own timestamp, not the arrival clock.
 * - With the process dead there is no React tree and no store in memory:
 *   the task hydrates the store itself (which appends `recovered`, as any
 *   restart does) and stops the updates if nothing is live any more.
 *
 * Permissions: ACCESS_FINE_LOCATION (foreground) plus FOREGROUND_SERVICE and
 * FOREGROUND_SERVICE_LOCATION in the manifest. No ACCESS_BACKGROUND_LOCATION:
 * expo-location only demands it when no `foregroundService` is given.
 */
export const LOCATION_TASK = "bricklap-recording";

let latest: LocationObject | null = null;
let batches = 0;
let lastBatchAt = 0;

/** Newest fix the task has seen in this JS context (for the boundary sample and the GPS line). */
export function latestLocation(): LocationObject | null {
  return latest;
}

export function batchesReceived(): number {
  return batches;
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
      const live = store.hydrate();
      diag("headless_hydrate", { liveId: live?.id ?? null, samples: live?.samples.length ?? null });
      if (!live) {
        // Nothing is recording any more; a zombie service would only burn battery.
        await stopBackgroundRecording("no live session");
        return;
      }
    }

    const arrivedAt = Date.now();
    for (const loc of locations) {
      store.pushSample(sampleFromGps(loc.coords, loc.timestamp));
    }
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

/**
 * Start (or re-arm) the service. Must be called with the app in the
 * foreground — Android refuses to start a foreground service otherwise.
 */
export async function startBackgroundRecording(notification: { title: string; body: string }): Promise<void> {
  latest = null;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    // Deliver every fix as soon as it exists, foreground or not; batching
    // for battery is exactly what this experiment measures the cost of.
    deferredUpdatesInterval: 0,
    deferredUpdatesDistance: 0,
    foregroundService: {
      notificationTitle: notification.title,
      notificationBody: notification.body,
      notificationColor: "#070708",
      // Swiping the app away must not kill the recording.
      killServiceOnDestroy: false,
    },
  });
  diag("service_start", { task: LOCATION_TASK });
  await diagBattery(true);
}

export async function stopBackgroundRecording(reason: string): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
    diag("service_stop", { reason, batches });
    await diagBattery(true);
  } catch (e) {
    diag("service_stop", { reason, error: String(e) });
  }
  latest = null;
}
