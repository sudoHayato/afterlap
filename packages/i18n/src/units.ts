import { formatDistance, formatPace, formatSpeedKmh } from "@bricklap/engine";

/**
 * The unit-system preference that is meant to cross every formatter in the
 * apps, so a future settings screen only has to change one value instead of
 * hunting down every place a distance or speed is rendered.
 *
 * `"imperial"` is declared now so the preference type and any UI for it can
 * be built ahead of time, but it is NOT implemented: every function below
 * throws for it instead of silently mislabelling metric numbers as miles.
 * See docs/BACKLOG.md for the follow-up.
 */
export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];
export const DEFAULT_UNIT_SYSTEM: UnitSystem = "metric";

function assertImplemented(unit: UnitSystem): void {
  if (unit === "imperial") {
    throw new Error(
      "@bricklap/i18n: the imperial unit system is declared but not implemented yet (docs/BACKLOG.md)",
    );
  }
}

export function formatDistanceForUnit(meters: number, unit: UnitSystem = DEFAULT_UNIT_SYSTEM): string {
  assertImplemented(unit);
  return formatDistance(meters);
}

export function formatSpeedForUnit(mps: number, unit: UnitSystem = DEFAULT_UNIT_SYSTEM): string {
  assertImplemented(unit);
  return formatSpeedKmh(mps);
}

export function formatPaceForUnit(
  meters: number,
  durationMs: number,
  unit: UnitSystem = DEFAULT_UNIT_SYSTEM,
): string {
  assertImplemented(unit);
  return formatPace(meters, durationMs);
}
