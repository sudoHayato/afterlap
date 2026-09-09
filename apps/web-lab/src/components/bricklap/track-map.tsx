import { useMemo } from "react";
import type { Sample } from "@/lib/afterlap/types";
import { cn } from "@/lib/utils";

export function TrackMap({
  samples,
  className,
}: {
  samples: Sample[];
  className?: string;
}) {
  const path = useMemo(() => {
    if (samples.length < 2) return null;
    const lats = samples.map((s) => s.lat);
    const lngs = samples.map((s) => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.1;
    const dLat = Math.max(maxLat - minLat, 0.0004);
    const dLng = Math.max(maxLng - minLng, 0.0004);
    const w = 320;
    const h = 200;
    const toX = (lng: number) => ((lng - minLng) / dLng) * w * (1 - pad * 2) + w * pad;
    const toY = (lat: number) =>
      h - (((lat - minLat) / dLat) * h * (1 - pad * 2) + h * pad);

    const d = samples
      .map((s, i) => `${i === 0 ? "M" : "L"}${toX(s.lng).toFixed(1)},${toY(s.lat).toFixed(1)}`)
      .join(" ");
    const last = samples[samples.length - 1]!;
    const first = samples[0]!;
    return {
      d,
      last: { x: toX(last.lng), y: toY(last.lat) },
      first: { x: toX(first.lng), y: toY(first.lat) },
    };
  }, [samples]);

  return (
    <div className={cn("relative overflow-hidden bg-map", className)}>
      <svg
        viewBox="0 0 320 200"
        className="h-full w-full"
        role="img"
        aria-label="Session track"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="320" height="200" fill="var(--color-map)" />
        <rect width="320" height="200" fill="url(#grid)" />
        {path ? (
          <>
            <path
              d={path.d}
              fill="none"
              stroke="var(--color-track-ghost)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={path.d}
              fill="none"
              stroke="var(--color-track)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={path.first.x} cy={path.first.y} r="3" fill="var(--color-muted)" />
            <circle cx={path.last.x} cy={path.last.y} r="4.2" fill="var(--color-primary)" />
          </>
        ) : (
          <g>
            <circle cx="160" cy="92" r="4.5" fill="var(--color-primary)" className="pulse-dot" />
            <text
              x="160"
              y="124"
              textAnchor="middle"
              fill="var(--color-muted)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              Waiting for movement
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
