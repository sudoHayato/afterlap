import { Link, useNavigate } from "@tanstack/react-router";
import { Play, Watch } from "lucide-react";
import { useMemo, useState } from "react";
import {
  currentSport,
  durationMs,
  formatDay,
  formatDuration,
  segmentsFromEvents,
  sessionMetrics,
  type Sport,
} from "@bricklap/engine";
import { formatDistanceForUnit } from "@bricklap/i18n";
import { SegmentTape } from "@/components/bricklap/segment-tape";
import { AppShell, Wordmark } from "@/components/bricklap/shell";
import { SportPicker } from "@/components/bricklap/sport-picker";
import { Button } from "@/components/ui/button";
import { locale, t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";

export function HomeView() {
  const navigate = useNavigate();
  const stored = useBricklap((s) => s.sessions);
  const start = useBricklap((s) => s.start);
  const live = useBricklap((s) => s.live());
  const [sport, setSport] = useState<Sport>("run");

  const history = useMemo(
    () => stored.filter((s) => s.status === "stopped"),
    [stored],
  );

  function onStart() {
    start(sport);
    void navigate({ to: "/record" });
  }

  return (
    <AppShell>
      <Wordmark kicker={t("home.kicker")} />

      <header className="mt-12">
        <p className="text-[0.68rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {t("home.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-6xl leading-[0.86] tracking-tight text-foreground uppercase">
          {t("home.taglineLine1")}
          <br />
          {t("home.taglineLine2")}
        </h1>
        <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
          {t("home.subtitle")}
        </p>
      </header>

      {live ? (
        <div className="mt-10 grid gap-2">
          <Link
            to="/record"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-5"
          >
            <div>
              <p className="text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {t("home.liveBadge")}
              </p>
              <p className="mt-1 font-display text-4xl tracking-tight tabular-nums">
                {formatDuration(durationMs(live))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`sport.${currentSport(live.events) ?? "run"}.live`)}
              </p>
            </div>
            <span className="size-2.5 rounded-full bg-primary pulse-dot" />
          </Link>
          <Link
            to="/watch"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground"
          >
            <Watch className="size-4" />
            {t("home.openWatch")}
          </Link>
        </div>
      ) : (
        <section className="mt-10 space-y-4">
          <p className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {t("home.firstSport")}
          </p>
          <SportPicker value={sport} onChange={setSport} />
          <Button size="xl" className="w-full rounded-2xl" onClick={onStart}>
            <Play className="size-5 fill-current" />
            {t("common.start")}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              start(sport);
              void navigate({ to: "/watch" });
            }}
          >
            <Watch className="size-4" />
            {t("home.startOnWatch")}
          </Button>
        </section>
      )}

      <section className="mt-14 flex-1">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {t("home.history")}
          </h2>
          <p className="text-xs text-subtle tabular-nums">{history.length}</p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("home.noSessions")}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((session) => {
              const segs = segmentsFromEvents(session.events);
              const metrics = sessionMetrics(session);
              return (
                <li key={session.id}>
                  <Link
                    to="/session/$id"
                    params={{ id: session.id }}
                    className="block rounded-2xl border border-border bg-card px-4 py-4 transition-colors duration-[var(--motion-quick)] hover:border-border-strong"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-foreground">
                        {segs.map((s) => t(`sport.${s.sport}.label`)).join(" → ")}
                      </p>
                      <p className="font-display text-xl leading-none tabular-nums tracking-tight">
                        {formatDuration(metrics.durationMs)}
                      </p>
                    </div>
                    <SegmentTape session={session} segments={segs} className="mt-3" />
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      {formatDay(session.createdAt, locale)} ·{" "}
                      {formatDistanceForUnit(metrics.distanceM)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
