import { SPORT_META, segmentMetrics, type Segment, type Session } from "@bricklap/engine";
import { cn } from "@/lib/utils";

const TONE = ["bg-primary", "bg-primary/70", "bg-primary/45", "bg-primary/25"] as const;

export function SegmentTape({
  session,
  segments,
  at,
  className,
}: {
  session: Session;
  segments: Segment[];
  at?: number;
  className?: string;
}) {
  const widths = segments.map((seg) =>
    Math.max(segmentMetrics(session, seg, at).durationMs, 800),
  );
  const total = widths.reduce((s, n) => s + n, 0);

  return (
    <div
      className={cn("flex h-1.5 overflow-hidden rounded-full bg-secondary", className)}
      aria-hidden="true"
    >
      {segments.map((seg, i) => (
        <div
          key={seg.index}
          title={SPORT_META[seg.sport].label}
          className={TONE[i % TONE.length]}
          style={{ width: `${(widths[i]! / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
