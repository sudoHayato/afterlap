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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isLive } from "@bricklap/engine";
import { RECOVERED_HEADLESS_TYPE, type StoredSession } from "../persistence";
import {
  DbPuller,
  PKG,
  adb,
  appPid,
  forceStop,
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
    console.log(
      `revived ${revived.headless[0]!.at - killAt} ms after the kill: pid ${pidBefore} -> ${pidAfter}, ` +
        `${revived.fresh.length} fixes newer than the kill, service foreground=${serviceRunning()}`,
    );
    // Nothing recorded before the kill was lost, and the engine sees a plain recovered.
    expect(afterKill.session.samples.length).toBeGreaterThan(beforeKill.session.samples.length);
    expect(afterKill.session.events.map((e) => e.type)).toEqual(["started", "recovered"]);
    expect(isLive(afterKill.session)).toBe(true);
    expect(pidAfter).not.toBe(pidBefore);
  }, REVIVAL_MS + 30_000);

  it("reopens on the resume screen and continues: the athlete's recovered lands next to the headless one", async () => {
    launchApp();
    await tapText("Continuar");
    await sleep(20_000);
    const rows = events(sessionId, "after-continue");
    const types = rows.map((r) => r.type);
    // Opening the app hydrates again ("user"); a second headless revival in
    // between is possible and fine (decision of the CTO, session 08).
    expect(types[0]).toBe("started");
    expect(types).toContain(RECOVERED_HEADLESS_TYPE);
    expect(types).toContain("recovered");
    expect(types.indexOf(RECOVERED_HEADLESS_TYPE)).toBeLessThan(types.lastIndexOf("recovered"));
    const now = stored("after-continue-replay")!;
    expect(now.session.samples.length).toBeGreaterThan(afterKill.session.samples.length);
    expect(serviceRunning()).toBe(true);
    console.log(`event rows after continue: ${types.join(", ")}; ${now.session.samples.length} fixes`);
  }, 90_000);

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
