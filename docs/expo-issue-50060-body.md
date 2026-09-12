### Summary

On Android with the New Architecture (bridgeless, one `ReactHost` per app), when a background task runs in a **headless** React instance and an **Activity is opened within the 2 s window** before `TaskService` invalidates that instance, the Activity reuses the headless instance. `invalidateAppRecord` then removes the task manager from `sHeadlessTaskManagers`, but `RNHeadlessAppLoader.invalidateApp` does **not** destroy the host (an Activity owns it now). `TaskManagerInternalModule` only calls `setTaskManager` once, in `onCreate`, so the app is left with **no task manager at all**.

Every later task event then goes through `executeTask` → `getTaskManager()` returns `null` → the event is queued and `loadApp` is called, whose `onReactContextInitialized` listener never fires (the context already exists). The job never finishes and later events queue behind it. For `expo-location` background location this means **location updates silently stop reaching JS** until the process dies.

### Environment

- expo 57.0.21, expo-task-manager 57.0.17 (latest), expo-location 57.0.16, react-native 0.86.3 (New Architecture, bridgeless)
- Release build (Hermes), no Metro
- Samsung Galaxy S24 Ultra, Android 16 (One UI 8.5), targetSdk 36

### Steps to reproduce

1. `Location.startLocationUpdatesAsync(TASK, { foregroundService: {...}, timeInterval: 1000 })` with a task defined at module load (`TaskManager.defineTask` in `index.ts`).
2. Kill the app process while the task is running (`adb shell run-as <pkg> kill -9 <pid>`; this is what the OOM killer does). Android restarts the process for the next location broadcast; `TaskService` runs each batch in a headless React instance (`Started headless task …`, then `ReactHost … Starting React Native destruction` 2 s after `Finished task`).
3. Right after a `Finished task '<TASK>'` line for the revived process, open the app: `adb shell am start -n <pkg>/.MainActivity` (we do it from a logcat stream, < 2 s after the line).
4. Observe: `ReactNativeJS: Running "main"` in the same process with **no** `Creating ReactInstance` / `Starting React Native destruction` in between (the instance was reused). The next location jobs log `Handling job with task name '<TASK>'` and `Started headless task …`, but **never** `Finished task`, and the task executor in JS is never called again.

Opening the app **after** the 2 s window works, because the headless instance has been destroyed and the Activity creates a new one that registers as a non-headless task manager.

### Logs (trimmed)

```
19:25:29.821 I/TaskService(29558): Finished task 'bricklap-recording' with eventId '…'.
19:25:29.822 I/TaskService(29558): Finished headless task 1 for 'com.bricklap.app'
19:25:31.809 W/unknown:BridgelessReact(29558): ReactHost{0}.startSurface(surfaceId = 0): Schedule
19:25:31.811 I/ReactNativeJS(29558): Running "main"
            (no destroy/create of the React instance; invalidateAppRecord runs at ~31.82)
19:25:34.463 D/SecFgsManagerController: onForegroundStateChanged: [isForeground:true]:[packageName:com.bricklap.app]
19:25:37.784 I/TaskService(29558): Handling job with task name 'bricklap-recording' for app with scoping identifier 'com.bricklap.app'.
19:25:37.785 I/TaskService(29558): Started headless task 2 to keep JS timers alive for 'com.bricklap.app'
19:25:46.906 I/TaskService(29558): Handling job with task name 'bricklap-recording' for app with scoping identifier 'com.bricklap.app'.
            (no "Finished task" until the process is killed)
```

### Proposed fix

In `TaskService.invalidateAppRecord`, if the host survives the invalidation (same condition `RNHeadlessAppLoader.invalidateApp` uses to decide not to destroy it), keep the headless task manager as the app's task manager instead of dropping it:

```java
if (getAppLoader().invalidateApp(appScopeKey)) {
  final WeakReference<TaskManagerInterface> headless = sHeadlessTaskManagers.remove(appScopeKey);
  final Context context = mContextRef.get();
  if (headless != null && context != null) {
    new Handler(context.getMainLooper()).post(() -> {
      ReactHost reactHost = ((ReactApplication) context.getApplicationContext()).getReactHost();
      if (reactHost != null
          && reactHost.getLifecycleState() != LifecycleState.BEFORE_CREATE
          && headless.get() != null
          && sTaskManagers.get(appScopeKey) == null) {
        sTaskManagers.put(appScopeKey, headless);
      }
    });
  }
}
```

The runnable is posted on the main looper after the one `invalidateApp` posts, so it sees the same lifecycle decision.

### Verification

We reproduce it deterministically on the device: a test streams logcat, starts the Activity as soon as the revived process logs `Finished task`, checks in logcat that the instance was reused (`Running "main"` in the same pid with no React instance created or destroyed in between), taps our in-app "continue" (which calls `startLocationUpdatesAsync` again) and waits for a new location to be persisted.

- **Unpatched** (expo-task-manager 57.0.17 as published): Activity started 193 ms after the headless task finished, instance reused, **no location update reached JS in 60 s**.
- **Patched** (the change above, built from source via `expo.autolinking.android.buildFromSource`): Activity started 138 ms after, instance reused, the task manager was kept, and location updates kept reaching the task and being persisted.

Note that the prebuilt AAR in `local-maven-repo` is what apps link by default on SDK 57, so a `patch-package` fix also needs `buildFromSource` for `expo-task-manager` and `unimodules-app-loader`.
