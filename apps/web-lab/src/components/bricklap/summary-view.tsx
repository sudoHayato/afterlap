import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  SPORT_PACE_KIND,
  formatDay,
  formatDuration,
  formatPace,
  formatSpeedKmh,
  seedSessions,
  segmentMetrics,
  segmentsFromEvents,
  sessionMetrics,
} from "@bricklap/engine";
import { formatDistanceForUnit } from "@bricklap/i18n";
import { SportIcon } from "@/components/bricklap/icons";
import { SegmentTape } from "@/components/bricklap/segment-tape";
import { AppShell } from "@/components/bricklap/shell";
import { TrackMap } from "@/components/bricklap/track-map";
import { Button } from "@/components/ui/button";
import { locale, t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";

export function SummaryView({ id }: { id: string }) {
  const navigate = useNavigate();
  const stored = useBricklap((s) => s.byId(id));
  const deleteSession = useBricklap((s) => s.deleteSession);
  const session = stored ?? seedSessions().find((s) => s.id === id);

  if (!session) {
    return (
      <AppShell>
        <p className="font-display text-lg tracking-[0.22em] uppercase">Bricklap</p>
        <p className="mt-16 text-sm text-muted-foreground">{t("summary.notFound")}</p>
        <Button className="mt-6" onClick={() => void navigate({ to: "/" })}>
          {t("common.home")}
        </Button>
      </AppShell>
    );
  }

  const segs = segmentsFromEvents(session.events);
  const total = sessionMetrics(session);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-display text-sm tracking-[0.22em] uppercase">Bricklap</p>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-danger"
          aria-label={t("summary.deleteSession")}
          onClick={() => {
            deleteSession(session.id);
            void navigate({ to: "/" });
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <p className="mt-10 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {formatDay(session.createdAt, locale)}
      </p>
      <h1 className="mt-2 font-display text-6xl leading-none tracking-tight tabular-nums">
        {formatDuration(total.durationMs)}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {formatDistanceForUnit(total.distanceM)} · {segs.length}{" "}
        {t(segs.length === 1 ? "summary.segmentsOne" : "summary.segmentsOther")}
      </p>
      <SegmentTape session={session} segments={segs} className="mt-5" />

      <TrackMap
        samples={session.samples}
        className="mt-6 h-48 rounded-2xl border border-border"
      />

      <ul className="mt-6 space-y-2">
        {segs.map((seg) => {
          const m = segmentMetrics(session, seg);
          const paceKind = SPORT_PACE_KIND[seg.sport];
          const extra =
            paceKind === "speed"
              ? formatSpeedKmh(m.avgSpeedMps)
              : paceKind === "pace"
                ? formatPace(m.distanceM, m.durationMs)
                : "";
          return (
            <li
              key={seg.index}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <SportIcon sport={seg.sport} className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t(`sport.${seg.sport}.label`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceForUnit(m.distanceM)}
                    {extra ? ` · ${extra}` : ""}
                  </p>
                </div>
              </div>
              <span className="font-display text-2xl tabular-nums tracking-tight">
                {formatDuration(m.durationMs)}
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        className="mt-8 w-full rounded-2xl"
        size="lg"
        onClick={() => void navigate({ to: "/" })}
      >
        {t("common.done")}
      </Button>
    </AppShell>
  );
}
