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
 * Driving the UI: every screen the test touches (idle, resume, history) is
 * read with `uiautomator dump` and its buttons tapped by their accessible
 * label — never by pixel colour or screen geometry. All buttons and sport
 * chips carry `testID` + `accessibilityLabel` (App.tsx) for this.
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
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isLive, segmentsFromEvents, sessionMetrics } from "@bricklap/engine";
import { DEFAULT_FLUSH_INTERVAL_MS, SqliteSessionStore, type StoredSession } from "../persistence";
import { openNodeDb } from "../test/helpers/node-db";

const PKG = "com.bricklap.app";
const DB_REMOTE = "files/SQLite/bricklap.db";
const DEV_CLIENT_URL = "exp+bricklap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081";
/** Documented ceiling on samples lost to a hard kill. */
const MAX_SAMPLE_LOSS_MS = 5_000;
const GPS_TICK_MS = 1_000;

// -- adb ---------------------------------------------------------------------

/**
 * Which adb to call. From WSL 2 a USB phone is only visible to Windows, so
 * BRICKLAP_ADB=/mnt/c/Users/<user>/platform-tools/adb.exe drives it through
 * the Windows binary; the default is the adb on PATH (wireless debugging).
 */
const ADB = process.env["BRICKLAP_ADB"] ?? "adb";

function adb(...args: string[]): string {
  // adb.exe on Windows ends lines with \r\n; keep every regex below Unix-only.
  return execFileSync(ADB, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, "");
}

function adbBytes(...args: string[]): Buffer {
  return execFileSync(ADB, args, { maxBuffer: 64 * 1024 * 1024 });
}

function shell(cmd: string): string {
  return adb("shell", cmd).trim();
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Phone's own clock, so kill times and sample times share a reference. */
function phoneNow(): number {
  return Number(shell("date +%s%3N"));
}

function tap(x: number, y: number): void {
  shell(`input tap ${Math.round(x)} ${Math.round(y)}`);
}

// -- UI: static screens via uiautomator ---------------------------------------

type Node = { text: string; bounds: [number, number, number, number] };

function dumpUi(): Node[] {
  shell("uiautomator dump /sdcard/bricklap-ui.xml >/dev/null");
  const xml = shell("cat /sdcard/bricklap-ui.xml");
  const nodes: Node[] = [];
  const re = /<node[^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  for (const m of xml.matchAll(re)) {
    nodes.push({ text: decodeXml(m[1]!), bounds: [+m[2]!, +m[3]!, +m[4]!, +m[5]!] });
  }
  return nodes;
}

function decodeXml(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function waitForText(text: string, timeoutMs = 20_000): Promise<Node> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  while (Date.now() < deadline) {
    try {
      const nodes = dumpUi();
      const hit = nodes.find((n) => n.text === text);
      if (hit) return hit;
      last = nodes.map((n) => n.text).filter(Boolean);
    } catch {
      // uiautomator could not get an idle state; the screen is still moving.
    }
    await sleep(500);
  }
  throw new Error(`"${text}" not on screen; saw: ${JSON.stringify(last)}`);
}

async function tapText(text: string): Promise<void> {
  const [l, t, r, b] = (await waitForText(text)).bounds;
  tap((l + r) / 2, (t + b) / 2);
}

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

function forceStop(): number {
  const at = phoneNow();
  shell(`am force-stop ${PKG}`);
  return at;
}

let pulls = 0;
const workDir = mkdtempSync(join(tmpdir(), "bricklap-recovery-"));

/** Copy the database (plus WAL and shm, which hold the latest commits) and replay it here. */
function pullAndReplay(label: string): StoredSession[] {
  const dir = join(workDir, `${++pulls}-${label}`);
  execFileSync("mkdir", ["-p", dir]);
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      const bytes = adbBytes("exec-out", `run-as ${PKG} cat ${DB_REMOTE}${suffix}`);
      if (bytes.length > 0) writeFileSync(join(dir, `bricklap.db${suffix}`), bytes);
    } catch {
      // No such file: a checkpointed database has no -wal/-shm.
    }
  }
  const db = openNodeDb(join(dir, "bricklap.db"));
  return new SqliteSessionStore(db).loadAll();
}

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
    expect(adb("devices").split("\n").some((l) => /\tdevice$/.test(l)), "a device on adb").toBe(true);
    expect(shell("curl -s http://localhost:8081/status"), "Metro through adb reverse").toContain("packager-status:running");
    // The phone is on USB, so "stay on while charging" keeps the screen from
    // timing out mid-test (a locked screen answers no input at all).
    shell("svc power stayon true");
    shell("input keyevent KEYCODE_WAKEUP");
    // A screen that timed out before the run sits behind the keyguard, and
    // every tap below would land on the lock screen. Only works without a PIN.
    shell("wm dismiss-keyguard");
    forceStop();
  }, 30_000);

  afterAll(() => {
    shell("svc power stayon false");
    allTimings.push(...timings());
    const byKind = (k: string) => allTimings.filter((t) => t.kind === k).map((t) => t.ms).sort((a, b) => a - b);
    const stats = (v: number[]) =>
      v.length ? { n: v.length, min: v[0], median: v[Math.floor(v.length / 2)], p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1] } : null;
    console.log("WRITE_TIMINGS " + JSON.stringify({ event: stats(byKind("event")), batch: stats(byKind("batch")) }));
    console.log("DB pulls in " + workDir);
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
    const nodes = (await waitForText("Voltar"), dumpUi());
    expect(nodes.some((n) => n.text.includes("Descartada"))).toBe(true);
    await tapText("Voltar");
    forceStop();
    const r = await launch();
    expect(r.liveId).toBeNull();
    await waitForText("Iniciar");
  }, 60_000);
});
