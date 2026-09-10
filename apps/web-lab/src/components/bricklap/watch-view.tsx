import { Link, useNavigate } from "@tanstack/react-router";
import {
  currentSport,
  durationMs,
  formatDuration,
  nextSport,
  segmentsFromEvents,
  sessionMetrics,
} from "@bricklap/engine";
import { formatDistanceForUnit } from "@bricklap/i18n";
import { AppShell } from "@/components/bricklap/shell";
import { useClock } from "@/components/bricklap/use-clock";
import { useRecorder } from "@/components/bricklap/use-recorder";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";

export function WatchView() {
  const navigate = useNavigate();
  const live = useBricklap((s) => s.live());
  const start = useBricklap((s) => s.start);
  const changeSport = useBricklap((s) => s.changeSport);
  const stop = useBricklap((s) => s.stop);
  const now = useClock(Boolean(live));

  useRecorder(live, false);

  const sport = live ? (currentSport(live.events) ?? "run") : "run";
  const segs = live ? segmentsFromEvents(live.events) : [];
  const metrics = live ? sessionMetrics(live, now) : null;

  function onStart() {
    start("run");
  }

  function onLap() {
    if (!live) return;
    changeSport(nextSport(sport));
  }

  function onStop() {
    const id = stop();
    if (id) void navigate({ to: "/session/$id", params: { id } });
  }

  return (
    <AppShell variant="watch">
      <p className="mb-6 text-center text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
        {t("watch.kicker")}
      </p>

      <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
        <div className="absolute inset-0 rounded-full bg-bezel shadow-[0_0_0_10px_#141416,0_30px_80px_rgba(0,0,0,0.45)]" />
        <div className="absolute inset-[9px] overflow-hidden rounded-full bg-watch text-foreground">
          <div className="flex h-full flex-col items-center px-8 pt-10 pb-8">
            <p className="font-display text-xs tracking-[0.28em] text-muted-foreground uppercase">
              Bricklap
            </p>

            {live ? (
              <>
                <p className="mt-6 font-display text-7xl leading-none tracking-tight tabular-nums">
                  {formatDuration(durationMs(live, now))}
                </p>
                <p className="mt-3 text-sm font-medium tracking-[0.18em] text-primary uppercase">
                  {t(`sport.${sport}.live`)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {formatDistanceForUnit(metrics?.distanceM ?? 0)}
                  {segs.length > 1 ? ` · ${segs.length} ${t("watch.laps")}` : ""}
                </p>
                <p className="mt-1 max-w-[18ch] text-center text-xs leading-snug text-subtle">
                  {segs.map((s) => t(`sport.${s.sport}.label`)).join(" → ")}
                </p>
                <div className="mt-auto grid w-full grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onLap}
                    className="h-12 rounded-full bg-primary text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase"
                  >
                    {t("watch.lap")}
                  </button>
                  <button
                    type="button"
                    onClick={onStop}
                    className="h-12 rounded-full border border-border text-xs font-semibold tracking-[0.16em] uppercase"
                  >
                    {t("common.stop")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-10 font-display text-5xl leading-none tracking-tight">00:00</p>
                <p className="mt-4 max-w-[16ch] text-center text-xs leading-relaxed text-muted-foreground">
                  {t("watch.idleHint")}
                </p>
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-auto h-14 w-full rounded-full bg-primary text-sm font-semibold tracking-[0.18em] text-primary-foreground uppercase"
                >
                  {t("common.start")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-[36ch] text-center text-xs leading-relaxed text-muted-foreground">
        {t("watch.disclaimer")}
      </p>

      <div className="mt-5 flex gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">{t("common.phone")}</Link>
        </Button>
        {live ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/record">{t("watch.liveLog")}</Link>
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
