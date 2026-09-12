/**
 * Background recording on a real phone (ADR 0010, session 08). Not part of
 * `npm test`: it needs a device on `adb`, the real GPS (a desk near a window
 * is enough — a motionless phone still gets a fix every 4–10 s), and a
 * **debuggable build that boots without Metro**: the release variant with
 * `debuggable true` (see the app README, "Build de release"). `run-as` is
 * what pulls the database, and only a debuggable package allows it; the
 * dev client would load the headless context from Metro, which is not the
 * case being proved. Run with
 * `BRICKLAP_ADB=… npm run test:device:background -w @bricklap/mobile`.
 *
 * What it proves: with the foreground service recording a walk, a hard
 * `kill -9` of the app process (what the OOM killer or One UI's "sleeping
 * apps" would do) does not end the session — Android revives the process
 * for the next batch of fixes, the task hydrates the store on its own
 * (`recovered_headless` on disk) and new samples keep landing; reopening the
 * app offers to continue, and continuing writes the athlete's own
 * `recovered` next to the headless one. The 30-min and 2-h field tests
 * cover the screen-off, pocket and battery side; this covers the death of
 * the process, which the field never reproduces on demand.
 *
 * The live screen is never dumped (see helpers/phone.ts): the session is
 * left live and discarded through the resume screen at the end.
 */
import { execFile, spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isLive } from "@bricklap/engine";
import { RECOVERED_HEADLESS_TYPE, type StoredSession } from "../persistence";
import {
  ADB,
  DbPuller,
  PKG,
  adb,
  appPid,
  forceStop,
  grantNotifications,
  hasDevice,
  phoneNow,
  releaseScreen,
  shell,
  sleep,
  tapText,
  waitForAnyText,
  waitForText,
  wakeScreen,
} from "./helpers/phone";

const SERVICE = "expo.modules.location.services.LocationTaskService";
/** How long a motionless phone may take to produce its first fixes indoors. */
const FIRST_FIXES_MS = 150_000;
/** How long Android may take to revive the process for the next batch after a kill. */
const REVIVAL_MS = 180_000;
/** How long a motionless phone may take to deliver a fix after Continuar re-arms the service. */
const CONTINUE_FIXES_MS = 60_000;
/** expo-task-manager invalidates a headless React instance this long after its last task finished. */
const HEADLESS_WINDOW_MS = 2_000;

type EventRow = { type: string; at: number };

function launchApp(): void {
  shell(`am start -W -n ${PKG}/.MainActivity >/dev/null`);
}

function serviceRunning(): boolean {
  const out = shell(`dumpsys activity services ${PKG}`);
  return out.includes(SERVICE) && /isForeground=true/.test(out);
}

async function waitFor<T>(label: string, probe: () => T | null, timeoutMs: number, everyMs = 3_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = probe();
    if (v !== null) return v;
    await sleep(everyMs);
  }
  throw new Error(`timed out after ${timeoutMs} ms waiting for ${label}`);
}

type LogLine = { atMs: number; pid: string; tag: string; msg: string };

/** `adb logcat -v epoch` lines since `sinceMs` (phone clock), parsed. */
function logSince(sinceMs: number): LogLine[] {
  const out = adb("logcat", "-d", "-v", "epoch", "-T", (sinceMs / 1000).toFixed(3));
  const lines: LogLine[] = [];
  for (const raw of out.split("\n")) {
    const m = raw.match(/^\s*(\d+\.\d+)\s+(\d+)\s+\d+\s+[VDIWEF]\s+(.*?)\s*:\s(.*)$/);
    if (m) lines.push({ atMs: Math.round(Number(m[1]) * 1000), pid: m[2]!, tag: m[3]!, msg: m[4]! });
  }
  return lines;
}

/**
 * Stream logcat and, the moment the headless task of `pid` finishes a batch,
 * start the Activity — the opening of the 2 s window in which
 * expo-task-manager still holds the headless React instance. Resolves with
 * the phone-clock time of that "Finished task" line.
 */
function launchRightAfterHeadlessBatch(pid: string, timeoutMs: number): Promise<number> {
  const since = (phoneNow() / 1000).toFixed(3);
  return new Promise((resolve, reject) => {
    const child = spawn(ADB, ["logcat", "-v", "epoch", "-T", since, "-s", "TaskService:I"]);
    let buf = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`no headless batch of pid ${pid} finished within ${timeoutMs} ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8").replace(/\r/g, "");
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const m = line.match(/^\s*(\d+\.\d+)\s+(\d+)\s+\d+\s+I\s+TaskService\s*:\s+Finished task 'bricklap-recording'/);
        if (!m || m[2] !== pid) continue;
        clearTimeout(timer);
        child.stdout.removeAllListeners("data");
        child.kill();
        execFile(ADB, ["shell", `am start -n ${PKG}/.MainActivity`], () => undefined);
        resolve(Math.round(Number(m[1]) * 1000));
        return;
      }
    });
  });
}

/**
 * Did the Activity reuse the headless React instance of `pid`? True when the
 * app's JS started ("Running main") after `finishedAt` in that same process,
 * with no React instance destroyed or created in between. Also returns when
 * the Activity was started, for the window check.
 */
function headlessInstanceReused(pid: string, finishedAt: number): { reused: boolean; launchedAt: number | null; evidence: string } {
  const lines = logSince(finishedAt);
  const start = lines.find((l) => l.tag === "ActivityTaskManager" && /START u0 .*com\.bricklap\.app\/\.MainActivity/.test(l.msg));
  const main = lines.find((l) => l.pid === pid && l.tag === "ReactNativeJS" && l.msg.includes('Running "main"'));
  const until = main?.atMs ?? Number.POSITIVE_INFINITY;
  const churn = lines.filter(
    (l) =>
      l.pid === pid &&
      l.atMs <= until &&
      /BridgelessReact/.test(l.tag) &&
      /Starting React Native destruction|Creating ReactInstance/.test(l.msg),
  );
  const reused = main !== undefined && churn.length === 0;
  const evidence = main
    ? `Running main +${main.atMs - finishedAt} ms, ${churn.length} instance create/destroy lines before it`
    : "no Running main in that process";
  return { reused, launchedAt: start?.atMs ?? null, evidence };
}

describe("background recording on the device", () => {
  const db = new DbPuller("background");
  let sessionId: string;
  let beforeKill: StoredSession;
  let afterKill: StoredSession;
  let killAt: number;
  let pidBefore: string;

  const events = (id: string, label: string): EventRow[] =>
    db
      .pullRaw(label)
      .raw.prepare("SELECT type, at FROM events WHERE session_id = ? ORDER BY seq")
      .all(id) as EventRow[];

  const stored = (label: string): StoredSession | undefined =>
    db.pullAndReplay(label).find((s) => s.session.id === sessionId);

  beforeAll(() => {
    expect(hasDevice(), "a device on adb").toBe(true);
    expect(shell(`run-as ${PKG} id`), "a debuggable build (run-as)").toContain("uid=");
    expect(shell("cmd location is-location-enabled"), "location services on").toContain("true");
    wakeScreen();
    forceStop();
    grantNotifications();
    adb("logcat", "-c");
  }, 30_000);

  afterAll(() => {
    releaseScreen();
    console.log("DB pulls in " + db.workDir);
  });

  it("starts a walk on the real GPS: foreground service up, fixes on disk", async () => {
    launchApp();
    let first = await waitForAnyText(["Iniciar", "Continuar"], 40_000);
    if (first.text === "Continuar") {
      // Something was left live (a founder's session or a previous run): the
      // resume screen is the only way this adapter ever closes it.
      await tapText("Descartar");
      first = await waitForAnyText(["Iniciar"], 20_000);
    }
    await tapText("Caminhada");
    await tapText("Iniciar");

    await waitFor("the foreground service", () => (serviceRunning() ? true : null), 30_000, 1_000);
    const live = await waitFor(
      "two fixes on disk",
      () => {
        const l = db.pullAndReplay("first-fixes").filter((s) => isLive(s.session));
        const s = l[l.length - 1];
        return s && s.session.samples.length >= 2 ? s : null;
      },
      FIRST_FIXES_MS,
      5_000,
    );
    sessionId = live.session.id;
    beforeKill = live;
    expect(live.session.events).toEqual([{ type: "started", at: expect.any(Number), sport: "walk" }]);
    expect(live.session.samples.every((s) => s.source === "gps")).toBe(true);
    pidBefore = appPid()!;
    expect(pidBefore).toBeTruthy();
    console.log(`session ${sessionId}: ${live.session.samples.length} fixes before the kill, pid ${pidBefore}`);
  }, 240_000);

  it("survives kill -9: Android revives the process, the task hydrates headless and keeps writing", async () => {
    killAt = phoneNow();
    // Same uid as the app, so the kill is allowed on a debuggable package —
    // and it is the death an OOM killer or "sleeping apps" would inflict,
    // not `am force-stop`, which also tears down the service and the jobs.
    shell(`run-as ${PKG} kill -9 ${pidBefore}`);
    await sleep(1_000);
    expect(appPid(), "the process is gone").not.toBe(pidBefore);

    const revived = await waitFor(
      "a headless recovery and a fix newer than the kill",
      () => {
        const rows = events(sessionId, "after-kill");
        const s = stored("after-kill-replay");
        if (!s) return null;
        const headless = rows.filter((r) => r.type === RECOVERED_HEADLESS_TYPE);
        const fresh = s.session.samples.filter((x) => x.t > killAt);
        return headless.length > 0 && fresh.length > 0 ? { rows, s, headless, fresh } : null;
      },
      REVIVAL_MS,
      5_000,
    );
    afterKill = revived.s;
    const pidAfter = appPid();
    // Not asserted: after a kill expo-location cannot bring the service back to
    // the foreground from the background ("Foreground location task cannot be
    // started while the app is in the background!" in logcat). The fixes keep
    // coming without it until the athlete taps Continuar (ADR 0010).
    console.log(
      `revived ${revived.headless[0]!.at - killAt} ms after the kill: pid ${pidBefore} -> ${pidAfter}, ` +
        `${revived.fresh.length} fixes newer than the kill, service record listed=${serviceRunning()}`,
    );
    // Nothing recorded before the kill was lost, and the engine sees a plain recovered.
    expect(afterKill.session.samples.length).toBeGreaterThan(beforeKill.session.samples.length);
    expect(afterKill.session.events.map((e) => e.type)).toEqual(["started", "recovered"]);
    expect(isLive(afterKill.session)).toBe(true);
    expect(pidAfter).not.toBe(pidBefore);
  }, REVIVAL_MS + 30_000);

  it("opens the app inside the 2 s headless window, continues, and keeps recording", async () => {
    // Deterministic on purpose (session 08). In a revived process each batch
    // runs in a headless React instance that expo-task-manager invalidates 2 s
    // after the task finishes. An Activity started inside that window reuses
    // the instance (bridgeless: one ReactHost per app), and the unpatched
    // invalidation then drops its task manager: every later batch hangs and no
    // sample reaches the disk until the process dies. patches/ fixes it. This
    // step must FAIL on an unpatched build and PASS on a patched one.
    const revivedPid = appPid();
    expect(revivedPid, "the revived process is alive").toBeTruthy();
    const finishedAt = await launchRightAfterHeadlessBatch(revivedPid!, 60_000);
    await sleep(3_000);
    const reuse = headlessInstanceReused(revivedPid!, finishedAt);
    const gapMs = reuse.launchedAt === null ? null : reuse.launchedAt - finishedAt;
    console.log(`activity started ${gapMs} ms after a headless batch finished; reused=${reuse.reused} (${reuse.evidence})`);
    // Preconditions: if either fails, the window was missed and the run proves nothing.
    expect(gapMs, "the Activity started inside the 2 s window").not.toBeNull();
    expect(gapMs!, "the Activity started inside the 2 s window").toBeLessThan(HEADLESS_WINDOW_MS);
    expect(reuse.reused, "the headless React instance was reused").toBe(true);

    await tapText("Continuar");
    const tapAt = phoneNow();
    let now: StoredSession;
    try {
      now = await waitFor(
        "a fix newer than Continuar on disk",
        () => {
          const s = stored("after-continue");
          return s && s.session.samples.some((x) => x.t > tapAt) ? s : null;
        },
        CONTINUE_FIXES_MS,
        5_000,
      );
    } catch (e) {
      throw new Error(`${(e as Error).message}: the task manager was lost in the reused instance (unpatched expo-task-manager?)`);
    }
    const types = events(sessionId, "after-continue-rows").map((r) => r.type);
    // Opening the app hydrates again ("user"); a second headless revival in
    // between is possible and fine (decision of the CTO, session 08).
    expect(types[0]).toBe("started");
    expect(types).toContain(RECOVERED_HEADLESS_TYPE);
    expect(types.indexOf(RECOVERED_HEADLESS_TYPE)).toBeLessThan(types.lastIndexOf("recovered"));
    expect(now.session.samples.length).toBeGreaterThan(afterKill.session.samples.length);
    expect(serviceRunning()).toBe(true);
    console.log(`event rows after continue: ${types.join(", ")}; ${now.session.samples.length} fixes`);
  }, 180_000);

  it("discards through the resume screen and leaves no service running", async () => {
    forceStop();
    launchApp();
    await tapText("Descartar");
    await waitForText("Iniciar");
    await sleep(2_000);
    const final = stored("after-discard")!;
    expect(final.discarded).toBe(true);
    expect(final.session.status).toBe("stopped");
    expect(serviceRunning()).toBe(false);
  }, 60_000);
});
