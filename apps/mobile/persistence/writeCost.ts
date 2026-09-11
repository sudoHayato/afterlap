import type { WriteTiming } from "./repository";

/**
 * How much the database writes cost, summed over a session — pure, so it runs
 * in Node. Decision of the CTO (session 08): the background task writes each
 * batch as soon as it lands (≈ 1 transaction per second instead of one every
 * 2 s) and that cost has to be measured in the 2-hour field test, on the
 * release build, where no diagnostics log exists. A summary, not a log:
 * counts, totals, the slowest write and a coarse histogram, a few hundred
 * bytes however long the session.
 */

/** Upper bounds, in ms, of the histogram buckets; one more bucket holds everything slower. */
export const WRITE_COST_BUCKETS_MS = [1, 2, 5, 10, 20, 50, 100] as const;

export type KindCost = {
  /** Transactions. */
  n: number;
  /** Rows written by them. */
  rows: number;
  totalMs: number;
  maxMs: number;
  /** `hist[i]` counts writes ≤ `WRITE_COST_BUCKETS_MS[i]`; the last entry counts the rest. */
  hist: number[];
};

export type WriteCost = {
  /** When this summary started (the session start). */
  since: number;
  updatedAt: number;
  /** Sample flushes — the background task's per-batch writes. */
  batch: KindCost;
  /** Event writes (START, CHANGE, STOP, recovered). */
  event: KindCost;
};

function emptyKind(): KindCost {
  return { n: 0, rows: 0, totalMs: 0, maxMs: 0, hist: new Array<number>(WRITE_COST_BUCKETS_MS.length + 1).fill(0) };
}

export function emptyWriteCost(since: number): WriteCost {
  return { since, updatedAt: since, batch: emptyKind(), event: emptyKind() };
}

export function bucketOf(ms: number): number {
  const i = WRITE_COST_BUCKETS_MS.findIndex((edge) => ms <= edge);
  return i === -1 ? WRITE_COST_BUCKETS_MS.length : i;
}

/** A new summary with one more write in it. */
export function addWriteTiming(cost: WriteCost, t: WriteTiming, at: number): WriteCost {
  const prev = cost[t.kind];
  const hist = prev.hist.slice();
  hist[bucketOf(t.ms)]! += 1;
  const next: KindCost = {
    n: prev.n + 1,
    rows: prev.rows + t.rows,
    totalMs: prev.totalMs + t.ms,
    maxMs: Math.max(prev.maxMs, t.ms),
    hist,
  };
  return { ...cost, updatedAt: at, [t.kind]: next };
}

/**
 * Upper bound, in ms, of the bucket that holds the p-th quantile (0 < p ≤ 1);
 * null with no writes, Infinity when it falls in the open bucket.
 */
export function quantileBoundMs(k: KindCost, p: number): number | null {
  if (k.n === 0) return null;
  const target = Math.ceil(p * k.n);
  let seen = 0;
  for (let i = 0; i < k.hist.length; i++) {
    seen += k.hist[i]!;
    if (seen >= target) return WRITE_COST_BUCKETS_MS[i] ?? Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

/** Parse a stored summary; null for anything that is not one (a corrupt or foreign file starts afresh). */
export function parseWriteCost(text: string): WriteCost | null {
  try {
    const v = JSON.parse(text) as Partial<WriteCost>;
    const okKind = (k: unknown): k is KindCost =>
      !!k &&
      typeof (k as KindCost).n === "number" &&
      typeof (k as KindCost).totalMs === "number" &&
      Array.isArray((k as KindCost).hist) &&
      (k as KindCost).hist.length === WRITE_COST_BUCKETS_MS.length + 1;
    if (typeof v.since !== "number" || typeof v.updatedAt !== "number" || !okKind(v.batch) || !okKind(v.event)) {
      return null;
    }
    return v as WriteCost;
  } catch {
    return null;
  }
}
