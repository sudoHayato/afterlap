import { Link, useNavigate } from "@tanstack/react-router";
import { Square, Watch } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  SPORT_PACE_KIND,
  currentSport,
  durationMs,
  formatDuration,
  formatPace,
  formatSpeedKmh,
  segmentMetrics,
  segmentsFromEvents,
  sessionMetrics,
  type Sport,
} from "@bricklap/engine";
import { formatDistanceForUnit } from "@bricklap/i18n";
import { SportIcon } from "@/components/bricklap/icons";
import { SegmentTape } from "@/components/bricklap/segment-tape";
import { AppShell, Wordmark } from "@/components/bricklap/shell";
import { SportPicker } from "@/components/bricklap/sport-picker";
import { TrackMap } from "@/components/bricklap/track-map";
import { useClock } from "@/components/bricklap/use-clock";
import { useRecorder } from "@/components/bricklap/use-recorder";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";

export function LiveView() {
  const navigate = useNavigate();
  const live = useBricklap((s) => s.live());
  const changeSport = useBricklap((s) => s.changeSport);
  const stop = useBricklap((s) => s.stop);
  const discardLive = useBricklap((s) => s.discardLive);
  const now = useClock(Boolean(live));
  const [picking, setPicking] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  useRecorder(live, false);

  if (!live) {
    return (
      <AppShell>
        <Wordmark />
        <p className="mt-16 text-sm text-muted-foreground">{t("live.noLiveSession")}</p>
        <Button className="mt-6" onClick={() => void navigate({ to: "/" })}>
          {t("common.back")}
        </Button>
      </AppShell>
    );
  }

  const sport = currentSport(live.events) ?? "run";
  const segs = segmentsFromEvents(live.events);
  const current = segs[segs.length - 1]!;
  const total = sessionMetrics(live, now);
  const currentMetrics = segmentMetrics(live, current, now);
  const paceKind = SPORT_PACE_KIND[sport];
  const splitValue =
    paceKind === "speed"
      ? formatSpeedKmh(currentMetrics.avgSpeedMps)
      : paceKind === "pace"
        ? formatPace(currentMetrics.distanceM, currentMetrics.durationMs)
        : "—";

  function onStop() {
    const id = stop();
    if (id) void navigate({ to: "/session/$id", params: { id } });
  }

  function onChange(next: Sport) {
    changeSport(next);
    setPicking(false);
  }

  return (
    <AppShell showFooter={false}>
      <Wordmark kicker={t("common.phone")} />

      <div className="mt-10 text-center">
        <p className="font-display text-8xl leading-none tracking-tight tabular-nums text-foreground">
          {formatDuration(durationMs(live, now))}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary pulse-dot" />
          <SportIcon sport={sport} className="size-3.5" />
          <span className="text-xs font-medium tracking-[0.14em] uppercase">
            {t(`sport.${sport}.live`)}
          </span>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-2">
        <Stat label={t("common.distance")} value={formatDistanceForUnit(total.distanceM)} />
        <Stat label={t("live.segment")} value={formatDuration(currentMetrics.durationMs)} />
        <Stat
          label={paceKind === "speed" ? t("common.speed") : t("common.pace")}
          value={splitValue}
        />
      </dl>

      <TrackMap
        samples={live.samples}
        className="mt-5 h-44 rounded-2xl border border-border"
      />

      <SegmentTape session={live} segments={segs} at={now} className="mt-4" />
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {segs.map((seg) => {
          const m = segmentMetrics(live, seg, now);
          const active = seg.index === current.index;
          return (
            <li
              key={seg.index}
              className={
                active
                  ? "rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                  : "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
              }
            >
              {t(`sport.${seg.sport}.label`)} {formatDuration(m.durationMs)}
            </li>
          );
        })}
      </ol>

      <div className="mt-auto space-y-2.5 pt-8">
        <Button size="xl" className="w-full rounded-2xl" onClick={() => setPicking(true)}>
          {t("common.change")}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => setConfirmStop(true)}>
            <Square className="size-3.5 fill-current" />
            {t("common.stop")}
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link to="/watch">
              <Watch className="size-4" />
              {t("common.watch")}
            </Link>
          </Button>
        </div>
      </div>

      {picking ? (
        <Overlay
          title={t("live.nextSportTitle")}
          copy={t("live.nextSportCopy")}
          onClose={() => setPicking(false)}
        >
          <SportPicker exclude={sport} onChange={onChange} size="lg" />
        </Overlay>
      ) : null}

      {confirmStop ? (
        <Overlay
          title={t("live.endSessionTitle")}
          copy={t("live.endSessionCopy")}
          onClose={() => setConfirmStop(false)}
        >
          <div className="grid gap-2">
            <Button size="lg" className="w-full rounded-xl" onClick={onStop}>
              {t("live.endSessionConfirm")}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => {
                discardLive();
                void navigate({ to: "/" });
              }}
            >
              {t("common.discard")}
            </Button>
          </div>
        </Overlay>
      ) : null}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <dt className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg leading-none tabular-nums tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function Overlay({
  title,
  copy,
  onClose,
  children,
}: {
  title: string;
  copy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-overlay sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-elevated p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <h2 className="font-display text-3xl uppercase tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{copy}</p>
        {children}
      </div>
    </div>
  );
}
