import { describe, expect, it } from "vitest";
import {
  WRITE_COST_BUCKETS_MS,
  addWriteTiming,
  bucketOf,
  emptyWriteCost,
  parseWriteCost,
  quantileBoundMs,
} from "../persistence/writeCost";

const T0 = 1_760_000_000_000;

describe("write cost summary (decision of the CTO, session 08)", () => {
  it("buckets by upper bound, inclusive, with an open last bucket", () => {
    expect(bucketOf(0.3)).toBe(0);
    expect(bucketOf(1)).toBe(0);
    expect(bucketOf(1.01)).toBe(1);
    expect(bucketOf(100)).toBe(WRITE_COST_BUCKETS_MS.length - 1);
    expect(bucketOf(250)).toBe(WRITE_COST_BUCKETS_MS.length);
  });

  it("adds batch and event writes to their own totals without mutating the input", () => {
    const empty = emptyWriteCost(T0);
    const a = addWriteTiming(empty, { kind: "batch", ms: 1.5, rows: 1 }, T0 + 1_000);
    const b = addWriteTiming(a, { kind: "batch", ms: 7, rows: 3 }, T0 + 2_000);
    const c = addWriteTiming(b, { kind: "event", ms: 3, rows: 2 }, T0 + 3_000);
    expect(empty.batch.n).toBe(0);
    expect(c.since).toBe(T0);
    expect(c.updatedAt).toBe(T0 + 3_000);
    expect(c.batch).toMatchObject({ n: 2, rows: 4, totalMs: 8.5, maxMs: 7 });
    expect(c.batch.hist).toEqual([0, 1, 0, 1, 0, 0, 0, 0]);
    expect(c.event).toMatchObject({ n: 1, rows: 2, totalMs: 3, maxMs: 3 });
  });

  it("bounds quantiles by bucket, null with no writes, Infinity in the open bucket", () => {
    let cost = emptyWriteCost(T0);
    expect(quantileBoundMs(cost.batch, 0.5)).toBeNull();
    for (let i = 0; i < 95; i++) cost = addWriteTiming(cost, { kind: "batch", ms: 0.8, rows: 1 }, T0);
    for (let i = 0; i < 4; i++) cost = addWriteTiming(cost, { kind: "batch", ms: 12, rows: 1 }, T0);
    cost = addWriteTiming(cost, { kind: "batch", ms: 400, rows: 1 }, T0);
    expect(quantileBoundMs(cost.batch, 0.5)).toBe(1);
    expect(quantileBoundMs(cost.batch, 0.95)).toBe(1);
    expect(quantileBoundMs(cost.batch, 0.99)).toBe(20);
    expect(quantileBoundMs(cost.batch, 1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("round-trips through JSON and refuses anything else", () => {
    const cost = addWriteTiming(emptyWriteCost(T0), { kind: "batch", ms: 2, rows: 1 }, T0 + 5);
    expect(parseWriteCost(JSON.stringify(cost))).toEqual(cost);
    expect(parseWriteCost("not json")).toBeNull();
    expect(parseWriteCost("{}")).toBeNull();
    expect(parseWriteCost(JSON.stringify({ ...cost, batch: { ...cost.batch, hist: [1] } }))).toBeNull();
  });
});
