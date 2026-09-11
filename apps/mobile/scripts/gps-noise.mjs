#!/usr/bin/env node
/**
 * GPS noise analysis over a pulled database (+ raw log), numbers only.
 *
 *   node apps/mobile/scripts/gps-noise.mjs <bricklap.db> <gps-raw.jsonl> --session <id> [--session <id>] [--svg <out.svg>]
 *
 * For every GPS segment of the given sessions it prints, per leg between
 * consecutive fixes: the instantaneous speed distribution (distance / dt),
 * the provider's own Doppler speed for comparison, the reported accuracy and
 * how the noise relates to it — then how candidate filters (minimum
 * displacement relative to accuracy, pace window in seconds) change the
 * total distance and the stability of the pace an athlete would read.
 *
 * Never prints a coordinate: legs are reduced to (dt, distance, accuracy,
 * speed) before anything is reported. Self-contained like geojson.mjs:
 * node:sqlite, no dependency, its own segment walk (sport_changed / stopped
 * cut segments, `recovered` is ignored — the engine's rules, mirrored).
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";

const EARTH_M = 6_371_000;
const GAP_MS = 5_000;
const GPS_SPORTS = new Set(["run", "bike", "walk", "transition"]);

const args = process.argv.slice(2);
const sessionIds = [];
let svgOut = null;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--session") sessionIds.push(args[++i]);
  else if (args[i] === "--svg") svgOut = args[++i];
  else files.push(args[i]);
}
const [dbPath, rawPath] = files;
if (!dbPath || !rawPath || sessionIds.length === 0) {
  console.error("usage: gps-noise.mjs <bricklap.db> <gps-raw.jsonl> --session <id> [--svg out.svg]");
  process.exit(2);
}

// -- load -------------------------------------------------------------------

const db = new DatabaseSync(dbPath, { readOnly: true });
const raw = new Map();
for (const line of readFileSync(rawPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  raw.set(`${r.session}:${r.t}`, r);
}

function haversineM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

/** Segments of a session with their samples; a sample is reduced to what the analysis needs. */
function loadSession(id) {
  const events = db.prepare("SELECT type, at, sport FROM events WHERE session_id = ? ORDER BY seq").all(id);
  const rows = db.prepare("SELECT t, lat, lng, speed_mps FROM samples WHERE session_id = ? ORDER BY seq").all(id);
  const segments = [];
  for (const e of events) {
    const open = segments.at(-1);
    if (e.type === "started" || e.type === "sport_changed") {
      if (open && open.endAt === null) open.endAt = e.at;
      segments.push({ sport: e.sport, startAt: e.at, endAt: null, samples: [] });
    } else if (e.type === "stopped" && open && open.endAt === null) open.endAt = e.at;
  }
  for (const r of rows) {
    const seg = segments.find((s) => r.t >= s.startAt && r.t < (s.endAt ?? Infinity));
    if (!seg) continue;
    const line = raw.get(`${id}:${r.t}`);
    seg.samples.push({ t: r.t, lat: r.lat, lng: r.lng, speedMps: r.speed_mps, accuracyM: line?.accuracyM ?? null });
  }
  return { id, startAt: events[0]?.at ?? 0, segments };
}

/** Legs between consecutive fixes of one segment: (dtS, dM, vMps, dopplerMps, accM). No coordinates survive this. */
function legsOf(seg) {
  const legs = [];
  for (let i = 1; i < seg.samples.length; i++) {
    const a = seg.samples[i - 1];
    const b = seg.samples[i];
    const dtS = (b.t - a.t) / 1000;
    if (dtS <= 0) continue;
    const dM = haversineM(a, b);
    legs.push({ t: b.t, dtS, dM, vMps: dM / dtS, dopplerMps: b.speedMps, accM: b.accuracyM, gap: b.t - a.t > GAP_MS });
  }
  return legs;
}

// -- stats -------------------------------------------------------------------

const sorted = (xs) => [...xs].sort((a, b) => a - b);
const pct = (xs, p) => {
  if (xs.length === 0) return NaN;
  const s = sorted(xs);
  const k = (s.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const std = (xs) => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};
const cv = (xs) => std(xs) / mean(xs);
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "—");
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "—");
const f3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : "—");
const pace = (mps) => {
  if (!(mps > 0)) return "—";
  const s = Math.round(1000 / mps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function describe(label, xs) {
  console.log(
    `  ${label.padEnd(26)} n=${String(xs.length).padStart(5)}  p5 ${f2(pct(xs, 0.05))}  p25 ${f2(pct(xs, 0.25))}  p50 ${f2(pct(xs, 0.5))}  p75 ${f2(pct(xs, 0.75))}  p95 ${f2(pct(xs, 0.95))}  mean ${f2(mean(xs))}  sd ${f2(std(xs))}  cv ${f2(cv(xs))}`,
  );
}

function histogram(label, xs, edges, unit) {
  console.log(`  ${label} (${unit})`);
  const max = Math.max(...edges.slice(1).map((hi, i) => xs.filter((x) => x >= edges[i] && x < hi).length), 1);
  for (let i = 1; i < edges.length; i++) {
    const n = xs.filter((x) => x >= edges[i - 1] && x < edges[i]).length;
    const bar = "█".repeat(Math.round((n / max) * 40));
    console.log(`    ${String(edges[i - 1]).padStart(5)}–${String(edges[i]).padEnd(5)} ${String(n).padStart(5)} ${bar}`);
  }
  const over = xs.filter((x) => x >= edges.at(-1)).length;
  if (over) console.log(`    ≥ ${edges.at(-1)}      ${String(over).padStart(5)}`);
}

// -- candidate filters ---------------------------------------------------------

/**
 * Keep a fix only when it moved at least `k × accuracy` from the last kept
 * fix (accuracy of the candidate; unknown accuracy counts as 30 m). The
 * first fix is always kept. Returns the kept samples.
 */
function gateByAccuracy(samples, k) {
  if (k <= 0) return samples;
  const kept = [];
  for (const s of samples) {
    const last = kept.at(-1);
    if (!last) {
      kept.push(s);
      continue;
    }
    const acc = s.accuracyM ?? 30;
    if (haversineM(last, s) >= k * acc) kept.push(s);
  }
  return kept;
}

/** Distance of a sample list, dropping legs faster than the engine's 55 m/s. */
function distanceOf(samples) {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = haversineM(samples[i - 1], samples[i]);
    const dt = Math.max(0.001, (samples[i].t - samples[i - 1].t) / 1000);
    if (d / dt > 55) continue;
    total += d;
  }
  return total;
}

/**
 * The pace an athlete would read once per second: distance covered in the
 * trailing `windowS` seconds over that time. Returns the series (m/s), one
 * value per sample after the first window fills.
 */
function windowedSpeed(samples, windowS) {
  const out = [];
  const cum = [0];
  for (let i = 1; i < samples.length; i++) {
    const d = haversineM(samples[i - 1], samples[i]);
    const dt = Math.max(0.001, (samples[i].t - samples[i - 1].t) / 1000);
    cum.push(cum[i - 1] + (d / dt > 55 ? 0 : d));
  }
  let j = 0;
  for (let i = 0; i < samples.length; i++) {
    while (samples[i].t - samples[j].t > windowS * 1000) j++;
    const span = (samples[i].t - samples[j].t) / 1000;
    if (span < windowS * 0.8) continue;
    out.push((cum[i] - cum[j]) / span);
  }
  return out;
}

/** Cumulative pace: what the app shows today (segment distance / elapsed), sampled once per fix. */
function cumulativeSpeed(samples) {
  const out = [];
  let cum = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = haversineM(samples[i - 1], samples[i]);
    const dt = Math.max(0.001, (samples[i].t - samples[i - 1].t) / 1000);
    cum += d / dt > 55 ? 0 : d;
    const elapsed = (samples[i].t - samples[0].t) / 1000;
    if (elapsed >= 30) out.push(cum / elapsed);
  }
  return out;
}

// -- run ---------------------------------------------------------------------

const svgSeries = [];

for (const id of sessionIds) {
  const s = loadSession(id);
  console.log(`\n=== session ${id} ===`);
  for (const [i, seg] of s.segments.entries()) {
    if (!GPS_SPORTS.has(seg.sport)) continue;
    const durS = ((seg.endAt ?? seg.samples.at(-1)?.t ?? seg.startAt) - seg.startAt) / 1000;
    const legs = legsOf(seg).filter((l) => !l.gap);
    const dist = distanceOf(seg.samples);
    console.log(
      `\n-- segment ${i + 1} ${seg.sport}  from ${mmss((seg.startAt - s.startAt) / 1000)}  duration ${mmss(durS)}  samples ${seg.samples.length}  legs ${legs.length}  distance ${f1(dist)} m  avg ${f2(dist / durS)} m/s (${pace(dist / durS)}/km)`,
    );
    if (legs.length < 10) {
      console.log("  (too short to analyse)");
      continue;
    }
    console.log("  cadence: dt p50 %s s, p95 %s s, > 2 s: %d legs", f2(pct(legs.map((l) => l.dtS), 0.5)), f2(pct(legs.map((l) => l.dtS), 0.95)), legs.filter((l) => l.dtS > 2).length);
    describe("leg distance (m)", legs.map((l) => l.dM));
    describe("speed = d/dt (m/s)", legs.map((l) => l.vMps));
    describe("provider speed (m/s)", legs.map((l) => l.dopplerMps));
    describe("accuracy (m)", legs.map((l) => l.accM).filter((a) => a !== null));
    const doppler = legs.reduce((a, l) => a + l.dopplerMps * l.dtS, 0);
    console.log(`  distance from provider speed × dt: ${f1(doppler)} m (${f1((100 * (doppler - dist)) / dist)} % vs haversine)`);

    histogram(`instantaneous speed histogram, ${seg.sport}`, legs.map((l) => l.vMps), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6], "m/s");

    console.log("  noise by reported accuracy (legs binned by the accuracy of their end fix):");
    const bins = [
      [0, 3],
      [3, 5],
      [5, 8],
      [8, 12],
      [12, 20],
      [20, Infinity],
    ];
    for (const [lo, hi] of bins) {
      const inBin = legs.filter((l) => l.accM !== null && l.accM >= lo && l.accM < hi);
      if (inBin.length === 0) continue;
      const v = inBin.map((l) => l.vMps);
      const dop = inBin.map((l) => l.dopplerMps);
      console.log(
        `    acc ${String(lo).padStart(2)}–${String(hi === Infinity ? "∞" : hi).padEnd(2)} m  n=${String(inBin.length).padStart(4)}  speed p50 ${f2(pct(v, 0.5))} sd ${f2(std(v))} cv ${f2(cv(v))}  | provider p50 ${f2(pct(dop, 0.5))} sd ${f2(std(dop))}  | |d/dt − provider| p50 ${f2(pct(inBin.map((l) => Math.abs(l.vMps - l.dopplerMps)), 0.5))}`,
      );
    }

    console.log("  what the athlete reads — pace stability (cv of the pace series; lower is steadier; p95 of the 1 s jump between readings):");
    const cum = cumulativeSpeed(seg.samples);
    console.log(`    cumulative (today's screen)      cv ${f3(cv(cum))}  pace p5..p95 ${pace(pct(cum, 0.05))}..${pace(pct(cum, 0.95))}/km`);
    for (const w of [5, 10, 20, 30, 60]) {
      const ws = windowedSpeed(seg.samples, w);
      const jumps = ws.slice(1).map((v, k) => Math.abs(v - ws[k]));
      console.log(
        `    window ${String(w).padStart(2)} s (raw)                cv ${f3(cv(ws))}  pace p5..p95 ${pace(pct(ws, 0.05))}..${pace(pct(ws, 0.95))}/km  jump p95 ${f3(pct(jumps, 0.95))} m/s`,
      );
    }

    console.log("  candidate filters — distance change and windowed pace stability:");
    for (const k of [0, 0.25, 0.5, 1, 1.5]) {
      const kept = gateByAccuracy(seg.samples, k);
      const d = distanceOf(kept);
      const parts = [];
      for (const w of [10, 20, 30]) {
        const ws = windowedSpeed(kept, w);
        parts.push(`w${w} cv ${f3(cv(ws))}`);
      }
      console.log(
        `    k=${String(k).padEnd(4)} kept ${String(kept.length).padStart(5)}/${seg.samples.length}  distance ${f1(d)} m (${(d - dist >= 0 ? "+" : "") + f2((100 * (d - dist)) / dist)} %)  ${parts.join("  ")}`,
      );
    }

    svgSeries.push({
      label: `${id.slice(0, 8)} seg ${i + 1} ${seg.sport}`,
      raw: windowedSpeed(seg.samples, 5),
      w20: windowedSpeed(seg.samples, 20),
      k05w20: windowedSpeed(gateByAccuracy(seg.samples, 0.5), 20),
      avg: dist / durS,
    });
  }
}

// -- svg ---------------------------------------------------------------------

if (svgOut) {
  const W = 900;
  const H = 180;
  const PAD = 40;
  const rows = svgSeries.filter((s) => s.raw.length > 50);
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${rows.length * (H + 20) + 30}" font-family="system-ui, sans-serif" font-size="11">`);
  parts.push(`<style>text{fill:#333}.grid{stroke:#ddd;stroke-width:1}.raw{fill:none;stroke:#bbb;stroke-width:1}.w20{fill:none;stroke:#1f77b4;stroke-width:1.5}.k05{fill:none;stroke:#d62728;stroke-width:1.5}.avg{stroke:#2ca02c;stroke-width:1;stroke-dasharray:4 3}</style>`);
  rows.forEach((s, r) => {
    const top = 20 + r * (H + 20);
    const vmax = Math.max(1, pct(s.raw, 0.98) * 1.1);
    const n = s.raw.length;
    const x = (i, len) => PAD + ((W - 2 * PAD) * i) / Math.max(1, len - 1);
    const y = (v) => top + H - PAD / 2 - ((H - PAD) * Math.min(v, vmax)) / vmax;
    const path = (series) => series.map((v, i) => `${i ? "L" : "M"}${x(i, series.length).toFixed(1)},${y(v).toFixed(1)}`).join("");
    parts.push(`<text x="${PAD}" y="${top + 4}" font-weight="600">${s.label} — speed, m/s (grey: 5 s window · blue: 20 s window · red: 20 s window after k=0.5 accuracy gate · green dashed: segment average)</text>`);
    for (const g of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]) {
      if (g > vmax) break;
      parts.push(`<line class="grid" x1="${PAD}" x2="${W - PAD}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/><text x="${PAD - 28}" y="${(y(g) + 4).toFixed(1)}">${g}</text>`);
    }
    parts.push(`<path class="raw" d="${path(s.raw)}"/>`);
    parts.push(`<path class="w20" d="${path(s.w20)}"/>`);
    parts.push(`<path class="k05" d="${path(s.k05w20)}"/>`);
    parts.push(`<line class="avg" x1="${PAD}" x2="${W - PAD}" y1="${y(s.avg).toFixed(1)}" y2="${y(s.avg).toFixed(1)}"/>`);
    parts.push(`<text x="${PAD}" y="${top + H - 2}">time → (${n} readings, one per fix)</text>`);
  });
  parts.push("</svg>");
  writeFileSync(svgOut, parts.join("\n"));
  console.log(`\nsvg written to ${svgOut}`);
}
