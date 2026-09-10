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
 *
 * Driving the UI: static screens (idle, resume, history) are read with
 * `uiautomator dump` and buttons tapped by their text. The live screen
 * re-renders four times a second, which keeps uiautomator from ever seeing
 * an idle state, so there the Parar button is located by the colour of its
 * border in a raw screenshot and Mudar by its known offset above it.
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
/** Parar's border colour in App.tsx (btnDanger). */
const DANGER_RGB = [0xc0, 0x46, 0x3f] as const;

// -- adb ---------------------------------------------------------------------

/**
 * Which adb to call. From WSL 2 a USB phone is only visible to Windows, so
 * BRICKLAP_ADB=/mnt/c/Users/<user>/platform-tools/adb.exe drives it through
 * the Windows binary; the default is the adb on PATH (wireless debugging).
 */
const ADB = process.env["BRICKLAP_ADB"] ?? "adb";

function adb(...args: string[]): string {
  return execFileSync(ADB, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
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

// -- UI: live screen via raw screenshot ---------------------------------------

type Screenshot = { width: number; height: number; px: Buffer; offset: number };

function screenshot(): Screenshot {
  const buf = adbBytes("exec-out", "screencap");
  const width = buf.readUInt32LE(0);
  const height = buf.readUInt32LE(4);
  // Header is 12 bytes (w, h, format) on old Androids, 16 (+ colour space) since 8.0.
  const offset = buf.length - width * height * 4;
  if (offset !== 12 && offset !== 16) throw new Error(`unexpected screencap layout: ${buf.length} bytes for ${width}x${height}`);
  return { width, height, px: buf, offset };
}

function findColourBox(shot: Screenshot, rgb: readonly [number, number, number], tolerance = 24) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  const { width, height, px, offset } = shot;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = offset + (y * width + x) * 4;
      if (
        Math.abs(px[i]! - rgb[0]) <= tolerance &&
        Math.abs(px[i + 1]! - rgb[1]) <= tolerance &&
        Math.abs(px[i + 2]! - rgb[2]) <= tolerance
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, right: maxX, bottom: maxY };
}

function dpToPx(dp: number): number {
  const m = /(\d+)/.exec(shell("wm density"));
  const dpi = m ? Number(m[1]) : 160;
  return Math.round((dp * dpi) / 160);
}

/** Centre of Parar (red border) and of Mudar, the same-sized button 16dp above it. */
async function liveButtons(): Promise<{ parar: [number, number]; mudar: [number, number] }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const box = findColourBox(screenshot(), DANGER_RGB);
    if (box) {
      const cx = (box.left + box.right) / 2;
      const h = box.bottom - box.top;
      const parar: [number, number] = [cx, (box.top + box.bottom) / 2];
      const mudar: [number, number] = [cx, box.top - dpToPx(16) - h / 2];
      return { parar, mudar };
    }
    await sleep(500);
  }
  throw new Error("Parar button (red border) not found in screenshot");
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
    forceStop();
  }, 30_000);

  afterAll(() => {
    allTimings.push(...timings());
    const byKind = (k: string) => allTimings.filter((t) => t.kind === k).map((t) => t.ms).sort((a, b) => a - b);
    const stats = (v: number[]) =>
      v.length ? { n: v.length, min: v[0], median: v[Math.floor(v.length / 2)], p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1] } : null;
    console.log("WRITE_TIMINGS " + JSON.stringify({ event: stats(byKind("event")), batch: stats(byKind("batch")) }));
    console.log("DB pulls in " + workDir);
  });

  it("starts a session and lets samples settle on disk", async () => {
    const r = await launch();
    expect(r.liveId, "a clean start: nothing live on disk").toBeNull();
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
    expect(recovery.events).toBe(expected.events.length);
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

  it("continues into the same session and records a sport change", async () => {
    await tapText("Continuar");
    await sleep(GPS_TICK_MS * 2 + 500);
    const { mudar } = await liveButtons();
    tap(...mudar);
    await sleep(800);
    // The picker keeps the live screen ticking, but the chips do not move:
    // find "Bicicleta" through a screenshot-free route — the picker card
    // replaces the Mudar button, and its first chip sits at a fixed offset.
    // Simpler and honest: try uiautomator a few times; it sometimes catches an
    // idle window between renders. Fall back to the offset if it never does.
    let tapped = false;
    for (let i = 0; i < 6 && !tapped; i++) {
      try {
        const hit = dumpUi().find((n) => n.text === "Bicicleta");
        if (hit) {
          tap((hit.bounds[0] + hit.bounds[2]) / 2, (hit.bounds[1] + hit.bounds[3]) / 2);
          tapped = true;
        }
      } catch {
        await sleep(300);
      }
    }
    if (!tapped) {
      // Card padding 16dp + label line ~16dp + gap 10dp + half a chip (~20dp) below the card's top,
      // first chip centred ~48dp in from the card's left edge (20dp screen + 16dp card padding + 12dp).
      const { parar } = await liveButtons();
      const cardTop = parar[1] - dpToPx(16) - dpToPx(16) - dpToPx(62) - dpToPx(46);
      tap(dpToPx(20 + 16 + 48), cardTop + dpToPx(62));
    }
    await sleep(GPS_TICK_MS * 3 + 500);
    const stored = pullAndReplay("after-change").find((s) => s.session.id === sessionId)!;
    const types = stored.session.events.map((e) => e.type);
    expect(types).toEqual(["started", "recovered", "sport_changed"]);
    expect(stored.session.events.at(-1)).toMatchObject({ sport: "bike" });
    expect(stored.session.samples.length).toBeGreaterThan(recovery.samples!);
  }, 90_000);

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
      "sport_changed",
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
