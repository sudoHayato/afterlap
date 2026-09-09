import { describe, expect, it } from "vitest";
import { applyRecovered, RECOVERED_DEDUPE_MS, recoverLiveSessions, segmentsFromEvents } from "../src";
import { makeSession } from "./helpers";

const live = () => makeSession([{ type: "started", at: 0, sport: "run" }]);

describe("applyRecovered — recuperação de uma sessão ao vivo", () => {
  it("appends a 'recovered' event to a live session", () => {
    const next = applyRecovered(live(), 5_000);
    expect(next.events.at(-1)).toEqual({ type: "recovered", at: 5_000 });
    expect(next.status).toBe("live");
  });

  it("is a no-op (same reference) on a stopped session", () => {
    const stopped = makeSession([
      { type: "started", at: 0, sport: "run" },
      { type: "stopped", at: 1 },
    ]);
    expect(applyRecovered(stopped, 5_000)).toBe(stopped);
  });

  it("dedupes a second 'recovered' that lands less than 2000 ms after the last one", () => {
    const once = applyRecovered(live(), 1_000);
    const again = applyRecovered(once, 2_999); // 1999 ms later
    expect(again).toBe(once);
    expect(again.events.filter((e) => e.type === "recovered")).toHaveLength(1);
  });

  it("appends when exactly 2000 ms or more have passed", () => {
    const once = applyRecovered(live(), 1_000);
    const later = applyRecovered(once, 3_000); // exactly 2000 ms later
    expect(later.events.filter((e) => e.type === "recovered")).toHaveLength(2);
  });

  it("the dedupe only looks at the LAST event: a sport change in between resets it", () => {
    const once = applyRecovered(live(), 1_000);
    const changed = { ...once, events: [...once.events, { type: "sport_changed", at: 1_500, sport: "bike" } as const] };
    const again = applyRecovered(changed, 1_600);
    expect(again.events.filter((e) => e.type === "recovered")).toHaveLength(2);
  });

  it("does not mutate the input session", () => {
    const s = live();
    const before = s.events.length;
    applyRecovered(s, 10);
    expect(s.events).toHaveLength(before);
  });

  it("exposes the window as RECOVERED_DEDUPE_MS = 2000 and ignores sessions with a 'stopped' event", () => {
    expect(RECOVERED_DEDUPE_MS).toBe(2000);
    const stale = makeSession([{ type: "started", at: 0, sport: "run" }, { type: "stopped", at: 1 }], [], "live");
    expect(applyRecovered(stale, 5_000)).toBe(stale);
    expect(recoverLiveSessions([stale], 5_000)[0]).toBe(stale);
  });

  it("'recovered' never changes the derived segments", () => {
    const s = applyRecovered(live(), 5_000);
    expect(segmentsFromEvents(s.events)).toEqual(segmentsFromEvents(live().events));
  });
});

describe("recoverLiveSessions — hidratação", () => {
  it("marks only live sessions and keeps order and references of the others", () => {
    const a = makeSession([{ type: "started", at: 0, sport: "run" }], [], "live", "a");
    const b = makeSession([{ type: "started", at: 0, sport: "run" }, { type: "stopped", at: 9 }], [], "stopped", "b");
    const c = makeSession([{ type: "started", at: 0, sport: "bike" }], [], "live", "c");

    const out = recoverLiveSessions([a, b, c], 7_000);
    expect(out.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(out[1]).toBe(b);
    expect(out[0]!.events.at(-1)).toEqual({ type: "recovered", at: 7_000 });
    expect(out[2]!.events.at(-1)).toEqual({ type: "recovered", at: 7_000 });
  });

  it("returns an empty array for no sessions", () => {
    expect(recoverLiveSessions([], 1)).toEqual([]);
  });

  it("uses the current time when `at` is omitted", () => {
    const before = Date.now();
    const [s] = recoverLiveSessions([makeSession([{ type: "started", at: 0, sport: "run" }])]);
    const last = s!.events.at(-1)!;
    expect(last.type).toBe("recovered");
    expect(last.at).toBeGreaterThanOrEqual(before);
    expect(last.at).toBeLessThanOrEqual(Date.now());
  });
});
