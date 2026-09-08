import { Link, useNavigate } from "@tanstack/react-router";
import { Play, Watch } from "lucide-react";
import { useMemo, useState } from "react";
import { SegmentTape } from "@/components/afterlap/segment-tape";
import { AppShell, Wordmark } from "@/components/afterlap/shell";
import { SportPicker } from "@/components/afterlap/sport-picker";
import { Button } from "@/components/ui/button";
import {
  currentSport,
  durationMs,
  formatDay,
  formatDistance,
  formatDuration,
  segmentsFromEvents,
  sessionMetrics,
} from "@/lib/afterlap/engine";
import { seedSessions } from "@/lib/afterlap/seed";
import { useAfterlap } from "@/lib/afterlap/store";
import type { Sport } from "@/lib/afterlap/types";
import { SPORT_META } from "@/lib/afterlap/types";

export function HomeView() {
  const navigate = useNavigate();
  const stored = useAfterlap((s) => s.sessions);
  const start = useAfterlap((s) => s.start);
  const live = useAfterlap((s) => s.live());
  const [sport, setSport] = useState<Sport>("run");

  const sessions = stored.length > 0 ? stored : seedSessions();
  const history = useMemo(
    () => sessions.filter((s) => s.status === "stopped"),
    [sessions],
  );

  function onStart() {
    start(sport);
    void navigate({ to: "/record" });
  }

  return (
    <AppShell>
      <Wordmark kicker="Lab" />

      <header className="mt-12">
        <p className="text-[0.68rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Session, not sport
        </p>
        <h1 className="mt-3 font-display text-6xl leading-[0.86] tracking-tight text-foreground uppercase">
          Start once.
          <br />
          Train freely.
        </h1>
        <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
          Change sport without stopping the session. Phone for the log. Watch for the lap.
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
                Live · phone
              </p>
              <p className="mt-1 font-display text-4xl tracking-tight tabular-nums">
                {formatDuration(durationMs(live))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {SPORT_META[currentSport(live.events) ?? "run"].live}
              </p>
            </div>
            <span className="size-2.5 rounded-full bg-primary pulse-dot" />
          </Link>
          <Link
            to="/watch"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground"
          >
            <Watch className="size-4" />
            Open watch face
          </Link>
        </div>
      ) : (
        <section className="mt-10 space-y-4">
          <p className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            First sport
          </p>
          <SportPicker value={sport} onChange={setSport} />
          <Button size="xl" className="w-full rounded-2xl" onClick={onStart}>
            <Play className="size-5 fill-current" />
            Start
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
            Start on watch
          </Button>
        </section>
      )}

      <section className="mt-14 flex-1">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            History
          </h2>
          <p className="text-xs text-subtle tabular-nums">{history.length}</p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
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
                        {segs.map((s) => SPORT_META[s.sport].label).join(" → ")}
                      </p>
                      <p className="font-display text-xl leading-none tabular-nums tracking-tight">
                        {formatDuration(metrics.durationMs)}
                      </p>
                    </div>
                    <SegmentTape session={session} segments={segs} className="mt-3" />
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      {formatDay(session.createdAt)} · {formatDistance(metrics.distanceM)}
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
