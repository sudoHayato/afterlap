/**
 * Recovery test on a real phone. Not part of `npm test`: it needs a device on
 * `adb`, the dev client installed, and Metro reachable from the phone
 * (`adb reverse tcp:8081 tcp:8081` + `npm run dev:mobile`). Run with
 * `npm run test:device -w @bricklap/mobile`.
 *
 * What it proves: after `am force-stop` — the hardest kill Android can give a
 * foreground app short of pulling the battery — every event is still on disk,
 * at most a few seconds of samples are missing, and the state the app rebuilds
 * at boot is exactly the replay of the database pulled off the phone.
 * It records with the simulator (dev switch on the idle screen) so it runs
 * indoors; the real GPS is validated by the field test in the session 04 report.
 *
 * Driving the UI (helpers/phone.ts): every screen the test touches (idle,
 * resume, history) is read with `uiautomator dump` and its buttons tapped by
 * their accessible label — never by pixel colour or screen geometry. All
 * buttons and sport chips carry `testID` + `accessibilityLabel` (App.tsx).
 * The background recording (real GPS, process killed mid-session) has its
 * own test, background.device.test.ts, on a debuggable release build.
 *
 * The live screen (recording) is deliberately never dumped or tapped here:
 * it re-renders four times a second (the running clock), and on this RN
 * build `uiautomator dump` does not degrade gracefully under that — it fails
 * outright with "could not get idle state" on every attempt, `testID`
 * included (confirmed on-device; `testID` also doesn't surface as
 * `resource-id` on this RN/Android renderer — see the session report). So
 * CHANGE, which can only be exercised while live, stays out of this test.
 * It is covered by the engine's unit tests instead; see the session report.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isLive, segmentsFromEvents, sessionMetrics } from "@bricklap/engine";
import { DEFAULT_FLUSH_INTERVAL_MS, type StoredSession } from "../persistence";
import {
  DbPuller,
  adb,
  dumpUi,
  forceStop,
  grantNotifications,
  hasDevice,
  releaseScreen,
  scrollToAndTap,
  shell,
  sleep,
  tapText,
  waitForText,
  wakeScreen,
} from "./helpers/phone";

const DEV_CLIENT_URL = "exp+bricklap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081";
/** Documented ceiling on samples lost to a hard kill. */
const MAX_SAMPLE_LOSS_MS = 5_000;
const GPS_TICK_MS = 1_000;

// -- app lifecycle ------------------------------------------------------------

type Recovery = {
  liveId: string | null;
  events?: number;
  samples?: number;
  segments?: number;
  lastSampleT?: number | null;
  distanceM?: number;
};

async function launch(): Promise<Recovery> {
  adb("logcat", "-c");
  shell(`am start -W -a android.intent.action.VIEW -d "${DEV_CLIENT_URL}" >/dev/null`);
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    const log = adb("logcat", "-d", "-s", "ReactNativeJS");
    const line = log.split("\n").find((l) => l.includes("BRICKLAP_RECOVERY"));
    if (line) return JSON.parse(line.slice(line.indexOf("{"))) as Recovery;
    await sleep(500);
  }
  throw new Error("app did not log BRICKLAP_RECOVERY after launch (is Metro reachable?)");
}

const db = new DbPuller("recovery");
const pullAndReplay = (label: string): StoredSession[] => db.pullAndReplay(label);

function timings(): { kind: string; ms: number; rows: number }[] {
  return adb("logcat", "-d", "-s", "ReactNativeJS")
    .split("\n")
    .filter((l) => l.includes("BRICKLAP_TIMING"))
    .map((l) => JSON.parse(l.slice(l.indexOf("{"))) as { kind: string; ms: number; rows: number });
}

// -- the test -------------------------------------------------------------------

describe("recovery on the device", () => {
  let sessionId: string;
  let beforeKill: StoredSession[];
  let afterKill: StoredSession[];
  let killAt: number;
  let recovery: Recovery;
  const allTimings: { kind: string; ms: number; rows: number }[] = [];

  beforeAll(async () => {
    expect(hasDevice(), "a device on adb").toBe(true);
    expect(shell("curl -s http://localhost:8081/status"), "Metro through adb reverse").toContain("packager-status:running");
    // The phone is on USB, so "stay on while charging" keeps the screen from
    // timing out mid-test (a locked screen answers no input at all). A screen
    // behind the keyguard is only dismissed without a PIN: with one, the
    // phone has to be unlocked by hand before the run.
    wakeScreen();
    forceStop();
    grantNotifications();
  }, 30_000);

  afterAll(() => {
    releaseScreen();
    allTimings.push(...timings());
    const byKind = (k: string) => allTimings.filter((t) => t.kind === k).map((t) => t.ms).sort((a, b) => a - b);
    const stats = (v: number[]) =>
      v.length ? { n: v.length, min: v[0], median: v[Math.floor(v.length / 2)], p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1] } : null;
    console.log("WRITE_TIMINGS " + JSON.stringify({ event: stats(byKind("event")), batch: stats(byKind("batch")) }));
    console.log("DB pulls in " + db.workDir);
  });

  it("starts a session and lets samples settle on disk", async () => {
    let r = await launch();
    if (r.liveId !== null) {
      // A previous run (or a manual session) left something live: discard it
      // through the UI, which is the only way this adapter ever closes one.
      await tapText("Descartar");
      await waitForText("Iniciar");
      forceStop();
      r = await launch();
    }
    expect(r.liveId, "a clean start: nothing live on disk").toBeNull();
    // Dev-only switch (App.tsx): this test proves persistence, not the GPS,
    // and must pass indoors. A resumed session keeps the source of its last
    // sample, so the switch survives every kill below.
    await tapText("Simulado");
    await tapText("Iniciar");
    // Two flush intervals plus slack: at least one batch has certainly landed.
    await sleep(DEFAULT_FLUSH_INTERVAL_MS * 2 + 1_500);
    beforeKill = pullAndReplay("before-kill");
    const live = beforeKill.filter((s) => isLive(s.session));
    expect(live).toHaveLength(1);
    sessionId = live[0]!.session.id;
    expect(live[0]!.session.events).toEqual([{ type: "started", at: expect.any(Number), sport: "run" }]);
    expect(live[0]!.session.samples.length).toBeGreaterThanOrEqual(3);
  }, 90_000);

  it("survives am force-stop: events intact, sample loss within the bound", async () => {
    allTimings.push(...timings());
    killAt = forceStop();
    afterKill = pullAndReplay("after-kill");
    const stored = afterKill.find((s) => s.session.id === sessionId)!;
    expect(stored.session.events).toEqual(beforeKill.find((s) => s.session.id === sessionId)!.session.events);
    expect(stored.session.samples.length).toBeGreaterThanOrEqual(
      beforeKill.find((s) => s.session.id === sessionId)!.session.samples.length,
    );
    const lastT = stored.session.samples.at(-1)!.t;
    const lossMs = killAt - lastT;
    console.log(`kill at +${lossMs} ms after the last persisted sample`);
    expect(lossMs).toBeLessThanOrEqual(MAX_SAMPLE_LOSS_MS);
  }, 60_000);

  it("rebuilds at boot exactly what the pulled database replays, and offers to continue", async () => {
    recovery = await launch();
    const expected = afterKill.find((s) => s.session.id === sessionId)!.session;
    expect(recovery.liveId).toBe(sessionId);
    // hydrate() appends `recovered` before the app logs, so one more event than the pull.
    expect(recovery.events).toBe(expected.events.length + 1);
    expect(recovery.samples).toBe(expected.samples.length);
    expect(recovery.segments).toBe(segmentsFromEvents(expected.events).length);
    expect(recovery.lastSampleT).toBe(expected.samples.at(-1)!.t);
    const m = sessionMetrics(expected, expected.samples.at(-1)!.t);
    expect(recovery.distanceM).toBeCloseTo(m.distanceM, 3);
    await waitForText("Continuar");
    // The app appended `recovered` synchronously during hydrate: it is on disk already.
    const now = pullAndReplay("after-reopen").find((s) => s.session.id === sessionId)!;
    expect(now.session.events.at(-1)).toEqual({ type: "recovered", at: expect.any(Number) });
    expect(isLive(now.session)).toBe(true);
  }, 60_000);

  it("continues into the same session after reopening", async () => {
    // CHANGE is not exercised here: it can only be tapped on the live screen,
    // and `uiautomator dump` cannot read that screen at all on this RN build
    // (confirmed on-device: it fails with "could not get idle state" on every
    // attempt, testID included). CHANGE is covered by the engine's unit tests.
    await tapText("Continuar");
    // Generous margin: the tap itself and the screen transition eat into the
    // window before the GPS interval starts ticking again.
    await sleep(GPS_TICK_MS * 4 + 1_000);
    const stored = pullAndReplay("after-continue").find((s) => s.session.id === sessionId)!;
    expect(stored.session.events.map((e) => e.type)).toEqual(["started", "recovered"]);
    expect(stored.session.samples.length).toBeGreaterThan(recovery.samples!);
  }, 60_000);

  it("survives a kill in the middle of a sample batch, then discards with a flagged STOP", async () => {
    // Land somewhere inside a flush interval on purpose: not on a boundary.
    await sleep(GPS_TICK_MS + 300);
    const before = pullAndReplay("before-midbatch-kill").find((s) => s.session.id === sessionId)!;
    allTimings.push(...timings());
    const at = forceStop();
    const after = pullAndReplay("after-midbatch-kill").find((s) => s.session.id === sessionId)!;
    expect(after.session.events).toEqual(before.session.events);
    expect(after.session.samples.length).toBeGreaterThanOrEqual(before.session.samples.length);
    const lossMs = at - after.session.samples.at(-1)!.t;
    console.log(`mid-batch kill at +${lossMs} ms after the last persisted sample`);
    expect(lossMs).toBeLessThanOrEqual(MAX_SAMPLE_LOSS_MS);

    const r = await launch();
    expect(r.liveId).toBe(sessionId);
    expect(r.samples).toBe(after.session.samples.length);
    await tapText("Descartar");
    await waitForText("Iniciar");
    const final = pullAndReplay("after-discard").find((s) => s.session.id === sessionId)!;
    expect(final.discarded).toBe(true);
    expect(final.session.status).toBe("stopped");
    expect(final.session.events.map((e) => e.type)).toEqual([
      "started",
      "recovered",
      "recovered",
      "stopped",
    ]);
    // Nothing was deleted: the samples are all still there.
    expect(final.session.samples.length).toBe(after.session.samples.length);
  }, 120_000);

  it("lists the discarded session in the history and comes back clean after a restart", async () => {
    await tapText("Histórico");
    // Read the rows before scrolling: the newest session is at the top, and
    // "Voltar" is at the bottom, past however many sessions the phone holds.
    const nodes = (await waitForText("HISTÓRICO"), dumpUi());
    expect(nodes.some((n) => n.text.includes("Descartada"))).toBe(true);
    await scrollToAndTap("Voltar");
    forceStop();
    const r = await launch();
    expect(r.liveId).toBeNull();
    await waitForText("Iniciar");
  }, 60_000);
});
