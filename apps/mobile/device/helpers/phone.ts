/**
 * Driving the founder's phone from a device test: adb, the static screens
 * through `uiautomator dump`, and the database pulled off the phone.
 * Shared by the recovery test (simulator, dev client + Metro) and the
 * background-recording test (real GPS, debuggable release build).
 *
 * Every screen a test touches (idle, resume, history) is read with
 * `uiautomator dump` and its buttons tapped by their accessible label —
 * never by pixel colour or screen geometry. The live screen is never dumped:
 * it re-renders four times a second and `uiautomator` fails outright with
 * "could not get idle state" on it (session 03).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteSessionStore, type StoredSession } from "../../persistence";
import { openNodeDb, type NodeDb } from "../../test/helpers/node-db";

export const PKG = "com.bricklap.app";
export const DB_REMOTE = "files/SQLite/bricklap.db";

/**
 * Which adb to call. From WSL 2 a USB phone is only visible to Windows, so
 * BRICKLAP_ADB=/mnt/c/Users/<user>/platform-tools/adb.exe drives it through
 * the Windows binary; the default is the adb on PATH (wireless debugging).
 */
export const ADB = process.env["BRICKLAP_ADB"] ?? "adb";

export function adb(...args: string[]): string {
  // adb.exe on Windows ends lines with \r\n; keep every regex below Unix-only.
  return execFileSync(ADB, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, "");
}

export function adbBytes(...args: string[]): Buffer {
  return execFileSync(ADB, args, { maxBuffer: 64 * 1024 * 1024 });
}

export function shell(cmd: string): string {
  return adb("shell", cmd).trim();
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Phone's own clock, so kill times and sample times share a reference. */
export function phoneNow(): number {
  return Number(shell("date +%s%3N"));
}

export function tap(x: number, y: number): void {
  shell(`input tap ${Math.round(x)} ${Math.round(y)}`);
}

export function hasDevice(): boolean {
  return adb("devices")
    .split("\n")
    .some((l) => /\tdevice$/.test(l));
}

/** The app's process id, or null when it is not running. */
export function appPid(): string | null {
  try {
    const out = shell(`pidof ${PKG}`);
    return out ? out.split(/\s+/)[0]! : null;
  } catch {
    return null;
  }
}

/**
 * Grant the notification permission up front: the app asks for it at start
 * (session 08), and the system dialog would cover every button the test taps.
 * The dialog itself is checked by the founder on the phone, not here.
 */
export function grantNotifications(): void {
  shell(`pm grant ${PKG} android.permission.POST_NOTIFICATIONS`);
}

export function forceStop(): number {
  const at = phoneNow();
  shell(`am force-stop ${PKG}`);
  return at;
}

/** Keep the screen on and awake for the run; only works past the keyguard when there is no PIN, or the phone is already unlocked. */
export function wakeScreen(): void {
  shell("svc power stayon true");
  shell("input keyevent KEYCODE_WAKEUP");
  shell("wm dismiss-keyguard");
}

export function releaseScreen(): void {
  shell("svc power stayon false");
}

// -- UI: static screens via uiautomator ---------------------------------------

export type UiNode = { text: string; bounds: [number, number, number, number] };

export function dumpUi(): UiNode[] {
  shell("uiautomator dump /sdcard/bricklap-ui.xml >/dev/null");
  const xml = shell("cat /sdcard/bricklap-ui.xml");
  const nodes: UiNode[] = [];
  const re = /<node[^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  for (const m of xml.matchAll(re)) {
    nodes.push({ text: decodeXml(m[1]!), bounds: [+m[2]!, +m[3]!, +m[4]!, +m[5]!] });
  }
  return nodes;
}

function decodeXml(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** First of `texts` to show up on screen, with its node. */
export async function waitForAnyText(texts: string[], timeoutMs = 20_000): Promise<{ text: string; node: UiNode }> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  while (Date.now() < deadline) {
    try {
      const nodes = dumpUi();
      for (const text of texts) {
        const hit = nodes.find((n) => n.text === text);
        if (hit) return { text, node: hit };
      }
      last = nodes.map((n) => n.text).filter(Boolean);
    } catch {
      // uiautomator could not get an idle state; the screen is still moving.
    }
    await sleep(500);
  }
  throw new Error(`none of ${JSON.stringify(texts)} on screen; saw: ${JSON.stringify(last)}`);
}

export async function waitForText(text: string, timeoutMs = 20_000): Promise<UiNode> {
  return (await waitForAnyText([text], timeoutMs)).node;
}

export async function tapText(text: string): Promise<void> {
  const [l, t, r, b] = (await waitForText(text)).bounds;
  tap((l + r) / 2, (t + b) / 2);
}

/**
 * Bring `text` into view, then return it. `uiautomator dump` only reports
 * what is rendered, so a button below the fold does not exist as far as it
 * is concerned — and the history screen grows by one row per stored session,
 * so "Voltar" sinks out of sight as the phone accumulates test sessions.
 * Swipes the content up a few times, checking after each swipe.
 */
export async function scrollToText(text: string, swipes = 8): Promise<UiNode> {
  const size = shell("wm size");
  const [w, h] = (size.match(/(\d+)x(\d+)\s*$/) ?? ["", "1080", "2340"]).slice(1).map(Number) as [number, number];
  for (let i = 0; i < swipes; i++) {
    try {
      const hit = dumpUi().find((n) => n.text === text);
      if (hit) return hit;
    } catch {
      // Screen not idle yet; the swipe below settles it.
    }
    shell(`input swipe ${Math.round(w / 2)} ${Math.round(h * 0.7)} ${Math.round(w / 2)} ${Math.round(h * 0.25)} 250`);
    await sleep(600);
  }
  return waitForText(text, 5_000);
}

export async function scrollToAndTap(text: string): Promise<void> {
  const [l, t, r, b] = (await scrollToText(text)).bounds;
  tap((l + r) / 2, (t + b) / 2);
}

// -- the database, pulled off the phone -----------------------------------------

/** One directory per test file; every pull lands in a numbered subdirectory. */
export class DbPuller {
  private pulls = 0;
  readonly workDir: string;

  constructor(label: string) {
    this.workDir = mkdtempSync(join(tmpdir(), `bricklap-${label}-`));
  }

  /** Copy the database (plus WAL and shm, which hold the latest commits); returns the local path. Needs a debuggable build (`run-as`). */
  pull(label: string): string {
    const dir = join(this.workDir, `${++this.pulls}-${label}`);
    execFileSync("mkdir", ["-p", dir]);
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        const bytes = adbBytes("exec-out", `run-as ${PKG} cat ${DB_REMOTE}${suffix}`);
        if (bytes.length > 0) writeFileSync(join(dir, `bricklap.db${suffix}`), bytes);
      } catch {
        // No such file: a checkpointed database has no -wal/-shm.
      }
    }
    return join(dir, "bricklap.db");
  }

  /** Pull and replay through the adapter, exactly as the app does at boot. */
  pullAndReplay(label: string): StoredSession[] {
    return new SqliteSessionStore(openNodeDb(this.pull(label))).loadAll();
  }

  /** Pull and open raw: for what the replay folds away (row types, seqs). */
  pullRaw(label: string): NodeDb {
    return openNodeDb(this.pull(label));
  }
}
