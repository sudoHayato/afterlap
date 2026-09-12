#!/usr/bin/env node
/**
 * bricklap.db (+ optional gps-raw.jsonl) -> GeoJSON on stdout, summary on stderr.
 *
 *   node apps/mobile/scripts/geojson.mjs <bricklap.db> [gps-raw.jsonl] [--session <id>] > track.geojson
 *
 * Debug export for looking at a recorded track in any GeoJSON viewer. One
 * LineString per segment (property `sport`), one Point per weak fix when the
 * raw log is given. The summary per session — duration, samples, gaps over
 * 5 s, weak fixes — is what the field-test section of the session report asks for.
 *
 * Self-contained on purpose: plain SQL over node:sqlite (Node 24, no
 * dependency) and its own tiny segment walk. Node cannot import the engine
 * or the persistence adapter without a loader (their relative imports have
 * no extension), and a debug script does not justify one. The rules mirrored
 * here — segments cut at sport_changed / stopped, `recovered` and `recovered_headless` ignored — are
 * the engine's; if they ever change, change this too.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const GAP_MS = 5_000;
const EARTH_M = 6_371_000;

const args = process.argv.slice(2);
const only = args.includes("--session") ? args[args.indexOf("--session") + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--session");
const [dbPath, rawPath] = files;
if (!dbPath) {
  console.error("usage: geojson.mjs <bricklap.db> [gps-raw.jsonl] [--session <id>]");
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const events = db.prepare("SELECT seq, session_id, type, at, sport, discarded FROM events ORDER BY seq").all();
const samples = db.prepare("SELECT session_id, t, lat, lng, speed_mps, source FROM samples ORDER BY seq").all();

/** t -> raw line, for accuracy and the weak mark. */
const raw = new Map();
if (rawPath) {
  for (const line of readFileSync(rawPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    raw.set(`${r.session}:${r.t}`, r);
  }
}

const sessions = new Map();
for (const e of events) {
  let s = sessions.get(e.session_id);
  if (!s) {
    s = { id: e.session_id, createdAt: e.at, stoppedAt: null, discarded: false, segments: [], samples: [] };
    sessions.set(e.session_id, s);
  }
  const open = s.segments.at(-1);
  if (e.type === "started" || e.type === "sport_changed") {
    if (open && open.endAt === null) open.endAt = e.at;
    s.segments.push({ sport: e.sport, startAt: e.at, endAt: null });
  } else if (e.type === "stopped") {
    if (open && open.endAt === null) open.endAt = e.at;
    s.stoppedAt = e.at;
    s.discarded = e.discarded !== 0;
  }
}
for (const smp of samples) sessions.get(smp.session_id)?.samples.push(smp);

function haversineM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

const iso = (ms) => new Date(ms).toISOString();
const mmss = (ms) => {
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const features = [];
for (const s of sessions.values()) {
  if (only && s.id !== only) continue;
  const gaps = [];
  let distanceM = 0;
  let weak = 0;
  for (let i = 1; i < s.samples.length; i++) {
    const dt = s.samples[i].t - s.samples[i - 1].t;
    if (dt > GAP_MS) gaps.push({ at: s.samples[i - 1].t, ms: dt });
    distanceM += haversineM(s.samples[i - 1], s.samples[i]);
  }
  for (const [i, seg] of s.segments.entries()) {
    const end = seg.endAt ?? Infinity;
    const inSeg = s.samples.filter((p) => p.t >= seg.startAt && p.t < end);
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: inSeg.map((p) => [p.lng, p.lat]) },
      properties: { session: s.id, segment: i + 1, sport: seg.sport, startAt: iso(seg.startAt), endAt: seg.endAt ? iso(seg.endAt) : null, samples: inSeg.length },
    });
  }
  for (const p of s.samples) {
    const r = raw.get(`${s.id}:${p.t}`);
    if (!r?.weak) continue;
    weak++;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { session: s.id, at: iso(p.t), accuracyM: r.accuracyM, weak: true, mocked: r.mocked },
    });
  }
  const endAt = s.stoppedAt ?? s.samples.at(-1)?.t ?? s.createdAt;
  const sources = [...new Set(s.samples.map((p) => p.source))].join("+") || "none";
  console.error(
    [
      `session ${s.id}  ${iso(s.createdAt)}  ${s.stoppedAt ? (s.discarded ? "discarded" : "stopped") : "LIVE"}`,
      `  duration ${mmss(endAt - s.createdAt)}  samples ${s.samples.length} (${sources})  distance ${(distanceM / 1000).toFixed(2)} km`,
      `  segments ${s.segments.map((g) => g.sport).join(" > ")}`,
      `  gaps > ${GAP_MS / 1000}s: ${gaps.length}` +
        (gaps.length ? `  largest ${mmss(Math.max(...gaps.map((g) => g.ms)))} at ${iso(gaps.reduce((a, b) => (a.ms >= b.ms ? a : b)).at)}` : ""),
      rawPath ? `  weak fixes (> 30 m or no accuracy): ${weak}` : "  (no raw log: accuracy unknown)",
    ].join("\n"),
  );
}

process.stdout.write(JSON.stringify({ type: "FeatureCollection", features }, null, 1) + "\n");
