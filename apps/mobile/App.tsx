/**
 * Bricklap — Android app, Fase 2 (parte 2: GPS real em primeiro plano).
 *
 * INICIAR uma vez, MUDAR de desporto sem parar, PARAR no fim. Todo o estado da
 * sessão vive em @bricklap/engine (os eventos são a fonte de verdade;
 * segmentos e métricas são derivados) e todo o texto vem de @bricklap/i18n.
 *
 * Persistência (parte 1): cada evento é escrito de forma síncrona numa base
 * SQLite append-only (./persistence) antes de o ecrã reagir; as amostras vão
 * em lotes curtos. Ao arrancar, a app repõe a sessão que estava a decorrer
 * (evento `recovered`) e pergunta se continua ou descarta.
 *
 * GPS (parte 2): expo-location em primeiro plano a 1 Hz (./gps), com o ecrã
 * mantido ligado enquanto grava. Cada fix vira uma amostra `gps` na base e
 * uma linha no registo bruto (gps-raw.jsonl) com a precisão. O simulador
 * (createSim / stepSim / sampleFromSim) continua disponível por um
 * interruptor só em desenvolvimento; uma sessão retomada segue a fonte da
 * sua última amostra. Sem biblioteca de navegação: um `screen` discriminado.
 */
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SPORTS,
  SPORT_PACE_KIND,
  createSim,
  currentSport,
  durationMs,
  formatClock,
  formatDay,
  formatDuration,
  sampleFromGps,
  sampleFromSim,
  segmentMetrics,
  segmentsFromEvents,
  sessionMetrics,
  stepSim,
  type Sample,
  type SegmentMetrics,
  type Session,
  type SimState,
  type Sport,
} from "@bricklap/engine";
import { formatDistanceForUnit, formatPaceForUnit, formatSpeedForUnit } from "@bricklap/i18n";
import { isWeak, requestForegroundLocation, watchFixes, type Fix, type PermissionOutcome } from "./gps/location";
import { appendRawFix, rawFixLine } from "./gps/rawLog";
import { locale, t } from "./i18n";
import type { SessionSummary } from "./persistence";
import { getStore, logRecovery } from "./store";

const COLORS = {
  background: "#070708",
  foreground: "#f3f1ec",
  muted: "#9c9ca4",
  primary: "#e8e4db",
  card: "#121214",
  border: "#26262b",
} as const;

const CLOCK_TICK_MS = 250;
const GPS_TICK_MS = 1000;
const RESET_GUARD_MS = 700;

type Screen =
  | { kind: "opening" }
  | { kind: "idle" }
  | { kind: "resume" }
  | { kind: "live" }
  | { kind: "summary"; session: Session }
  | { kind: "history"; sessions: SessionSummary[] };

/** What the live screen shows about the GPS feed. */
type GpsStatus =
  | { kind: "off" }
  | { kind: "waiting" }
  | { kind: "fix"; lat: number; lng: number; accuracyM: number | null; weak: boolean }
  | { kind: "error"; message: string };

/** True once `ms` have elapsed since mount. */
function useArmedAfter(ms: number): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return armed;
}

function paceOrSpeed(sport: Sport, m: SegmentMetrics): string | null {
  const kind = SPORT_PACE_KIND[sport];
  if (kind === "pace") return formatPaceForUnit(m.distanceM, m.durationMs);
  if (kind === "speed") return formatSpeedForUnit(m.avgSpeedMps);
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "opening" });
  // Render cache of the store's live session; the store is the truth.
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [startSport, setStartSport] = useState<Sport>("run");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Dev-only switch; a release build always records real GPS.
  const [simEnabled, setSimEnabled] = useState(false);
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const [gps, setGps] = useState<GpsStatus>({ kind: "off" });

  // Refs so the interval callbacks never see a stale session or sim state.
  const sessionRef = useRef<Session | null>(null);
  const simRef = useRef<SimState>(createSim());
  const lastTickRef = useRef<number>(0);
  // Newest real fix, re-stamped for the boundary sample on CHANGE / STOP.
  const lastFixRef = useRef<Fix | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Boot: open, migrate, replay. A live session on disk means the app died
  // (or was killed) mid-session; ask before recording into it again.
  useEffect(() => {
    const store = getStore();
    const live = store.hydrate();
    if (live) {
      const segments = segmentsFromEvents(live.events);
      const metrics = sessionMetrics(live, live.samples.at(-1)?.t ?? live.createdAt);
      logRecovery({
        liveId: live.id,
        events: live.events.length,
        samples: live.samples.length,
        segments: segments.length,
        lastSampleT: live.samples.at(-1)?.t ?? null,
        distanceM: Math.round(metrics.distanceM * 1000) / 1000,
      });
      setSession(live);
      setScreen({ kind: "resume" });
    } else {
      logRecovery({ liveId: null });
      setScreen({ kind: "idle" });
    }
  }, []);

  // Going to the background is the moment a kill becomes likely: drain the
  // sample buffer so the bounded loss applies only to a foreground kill.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") getStore().flush();
    });
    return () => sub.remove();
  }, []);

  const recording = screen.kind === "live";

  /**
   * Advance the simulated GPS by the time elapsed since the last tick, using
   * the sport that is live right now, and return the resulting sample.
   * Returns null when there is no live session.
   */
  const tickSim = useCallback((): Sample | null => {
    const s = sessionRef.current;
    if (!s || s.status !== "live") return null;
    const sport = currentSport(s.events);
    if (!sport) return null;
    const ts = Date.now();
    const dt = Math.max(0, ts - lastTickRef.current);
    lastTickRef.current = ts;
    simRef.current = stepSim(simRef.current, sport, dt);
    return sampleFromSim(simRef.current, sport, ts);
  }, []);

  /** Store a sample and let the screen catch up to it. */
  const record = useCallback((sample: Sample) => {
    const store = getStore();
    store.pushSample(sample);
    setSession(store.live());
    // Keep `now` >= the newest sample so live metrics include it at once.
    setNow(sample.t);
  }, []);

  useEffect(() => {
    if (!recording) return;
    lastTickRef.current = Date.now();
    const clock = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

    if (simEnabled) {
      const sim = setInterval(() => {
        const sample = tickSim();
        if (sample) record(sample);
      }, GPS_TICK_MS);
      return () => {
        clearInterval(clock);
        clearInterval(sim);
      };
    }

    // Real GPS: the subscription is async, and the screen may already have
    // left by the time it lands — then it is dropped on arrival.
    let stop: (() => void) | null = null;
    let cancelled = false;
    setGps({ kind: "waiting" });
    watchFixes(
      (fix) => {
        const s = sessionRef.current;
        if (!s || s.status !== "live") return;
        const at = Date.now();
        lastFixRef.current = fix;
        record(sampleFromGps(fix.coords, at));
        appendRawFix(rawFixLine(s.id, at, fix));
        setGps({
          kind: "fix",
          lat: fix.coords.latitude,
          lng: fix.coords.longitude,
          accuracyM: fix.coords.accuracy,
          weak: isWeak(fix),
        });
      },
      (message) => setGps({ kind: "error", message }),
    ).then(
      (unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      },
      (e: unknown) => setGps({ kind: "error", message: String(e) }),
    );
    return () => {
      cancelled = true;
      stop?.();
      clearInterval(clock);
      setGps({ kind: "off" });
    };
  }, [recording, simEnabled, tickSim, record]);

  /**
   * A sample exactly on a CHANGE / STOP boundary keeps distance continuous
   * between the segment that ends and the one that starts. From the
   * simulator it is one more step; from the GPS it is the newest fix stamped
   * now. Null when there is nothing to stamp (no fix yet): the event still
   * goes through, the boundary just has no sample.
   */
  const boundarySample = useCallback((): Sample | null => {
    if (simEnabled) return tickSim();
    const s = sessionRef.current;
    const fix = lastFixRef.current;
    if (!s || s.status !== "live" || !fix) return null;
    return sampleFromGps(fix.coords, Date.now());
  }, [simEnabled, tickSim]);

  const start = useCallback(
    async (sport: Sport) => {
      if (!simEnabled) {
        const outcome = await requestForegroundLocation();
        setPermission(outcome);
        if (outcome !== "granted") return;
      }
      const ts = Date.now();
      const store = getStore();
      store.start(sport, ts);
      simRef.current = createSim();
      lastTickRef.current = ts;
      lastFixRef.current = null;
      if (simEnabled) store.pushSample(sampleFromSim(simRef.current, sport, ts));
      const live = store.live();
      sessionRef.current = live;
      setPickerOpen(false);
      setNow(ts);
      setSession(live);
      setScreen({ kind: "live" });
    },
    [simEnabled],
  );

  const change = useCallback(
    (sport: Sport) => {
      const sample = boundarySample();
      setPickerOpen(false);
      const store = getStore();
      if (sample) store.pushSample(sample);
      store.changeSport(sport, sample?.t ?? Date.now());
      setSession(store.live());
    },
    [boundarySample],
  );

  const stop = useCallback(() => {
    const sample = boundarySample();
    setPickerOpen(false);
    const store = getStore();
    if (sample) store.pushSample(sample);
    const id = store.stop(sample?.t ?? Date.now());
    setSession(null);
    // The summary is replayed from disk on purpose: what you see is what was saved.
    const stored = id ? store.byId(id) : undefined;
    setScreen(stored ? { kind: "summary", session: stored } : { kind: "idle" });
  }, [boundarySample]);

  const resume = useCallback(() => {
    const live = sessionRef.current;
    if (!live) return;
    // A session keeps the source it was recorded with: mixing simulated and
    // real fixes in one track would be nonsense.
    const last = live.samples.at(-1);
    setSimEnabled(last?.source === "sim");
    // Pick the simulation up where the last fix was, not back in Lisbon.
    simRef.current = last ? createSim({ lat: last.lat, lng: last.lng }) : createSim();
    lastFixRef.current = null;
    setNow(Date.now());
    setScreen({ kind: "live" });
  }, []);

  const discard = useCallback(() => {
    getStore().discardLive(Date.now());
    setSession(null);
    setScreen({ kind: "idle" });
  }, []);

  const openHistory = useCallback(() => {
    setScreen({ kind: "history", sessions: getStore().summaries() });
  }, []);

  const goIdle = useCallback(() => {
    setPickerOpen(false);
    setScreen({ kind: "idle" });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Bricklap</Text>
          <Text style={styles.kicker}>{t(simEnabled ? "mobile.kickerSim" : "mobile.kicker")}</Text>
        </View>

        {screen.kind === "opening" ? (
          <Text style={styles.hint}>{t("mobile.opening")}</Text>
        ) : screen.kind === "idle" ? (
          <IdleScreen
            sport={startSport}
            onPick={setStartSport}
            onStart={() => void start(startSport)}
            onHistory={openHistory}
            simEnabled={simEnabled}
            onSimEnabled={setSimEnabled}
            permission={permission}
          />
        ) : screen.kind === "resume" && session ? (
          <ResumeScreen session={session} now={now} onContinue={resume} onDiscard={discard} />
        ) : screen.kind === "live" && session ? (
          <LiveScreen
            session={session}
            now={now}
            gps={simEnabled ? null : gps}
            pickerOpen={pickerOpen}
            onTogglePicker={() => setPickerOpen((v) => !v)}
            onChange={change}
            onStop={stop}
          />
        ) : screen.kind === "summary" ? (
          <SummaryScreen session={screen.session} onReset={goIdle} />
        ) : screen.kind === "history" ? (
          <HistoryScreen sessions={screen.sessions} now={now} onBack={goIdle} />
        ) : null}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function IdleScreen(props: {
  sport: Sport;
  onPick: (s: Sport) => void;
  onStart: () => void;
  onHistory: () => void;
  simEnabled: boolean;
  onSimEnabled: (v: boolean) => void;
  permission: PermissionOutcome | null;
}) {
  const problem =
    props.simEnabled || props.permission === null || props.permission === "granted"
      ? null
      : props.permission === "denied"
        ? t("mobile.locationDenied")
        : props.permission === "blocked"
          ? t("mobile.locationBlocked")
          : t("mobile.locationServicesOff");
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionLabel}>{t("mobile.initialSport")}</Text>
      <SportPicker testIDPrefix="start-sport" selected={props.sport} onPick={props.onPick} />
      {__DEV__ ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("mobile.gpsSource")}</Text>
          <View style={styles.pickerRow}>
            <Chip
              testID="gps-source-gps"
              label={t("mobile.gpsReal")}
              active={!props.simEnabled}
              onPress={() => props.onSimEnabled(false)}
            />
            <Chip
              testID="gps-source-sim"
              label={t("mobile.gpsSim")}
              active={props.simEnabled}
              onPress={() => props.onSimEnabled(true)}
            />
          </View>
        </View>
      ) : null}
      <Button testID="btn-start" label={t("common.start")} kind="primary" big onPress={props.onStart} />
      {problem ? (
        <View style={styles.card}>
          <Text testID="location-problem" style={styles.problem}>
            {problem}
          </Text>
          {props.permission === "blocked" ? (
            <Button
              testID="btn-open-settings"
              label={t("mobile.openSettings")}
              kind="secondary"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
        </View>
      ) : null}
      <Text style={styles.hint}>{t("mobile.idleHint")}</Text>
      {props.simEnabled ? null : <Text style={styles.hint}>{t("mobile.locationRationale")}</Text>}
      <Button testID="btn-history" label={t("mobile.history")} kind="secondary" onPress={props.onHistory} />
    </View>
  );
}

function ResumeScreen(props: {
  session: Session;
  now: number;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const { session, now } = props;
  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("mobile.resumeTitle")}</Text>
        <Text style={styles.bigClock}>{formatDuration(durationMs(session, now))}</Text>
        <Text style={styles.hint}>{t("mobile.resumeCopy")}</Text>
      </View>
      <SegmentList session={session} now={now} />
      <Button testID="btn-continue" label={t("common.continue")} kind="primary" big onPress={props.onContinue} />
      <Button testID="btn-discard" label={t("common.discard")} kind="danger" onPress={props.onDiscard} />
    </View>
  );
}

function LiveScreen(props: {
  session: Session;
  now: number;
  /** Null while the simulator is the source. */
  gps: GpsStatus | null;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onChange: (s: Sport) => void;
  onStop: () => void;
}) {
  // "Screen on" is the Fase 2 test condition; Android would lock it in 30 s.
  useKeepAwake();
  const { session, now } = props;
  const segments = segmentsFromEvents(session.events);
  const sport = currentSport(session.events) ?? "run";
  const total = sessionMetrics(session, now);
  const current = segments[segments.length - 1];
  const currentM = current ? segmentMetrics(session, current, now) : null;
  const rate = currentM ? paceOrSpeed(sport, currentM) : null;

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.liveSport}>{t(`sport.${sport}.live`)}</Text>
        <Text style={styles.bigClock}>
          {formatDuration(durationMs(session, now))}
        </Text>
        <Text style={styles.stat}>
          {t("mobile.totalDistanceLabel")} · {formatDistanceForUnit(total.distanceM)}
        </Text>
        <GpsLine gps={props.gps} samples={session.samples.length} />
      </View>

      {currentM ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("mobile.currentSegment")}</Text>
          <View style={styles.row}>
            <Metric label={t("common.time")} value={formatDuration(currentM.durationMs)} />
            <Metric label={t("common.distance")} value={formatDistanceForUnit(currentM.distanceM)} />
            {rate ? (
              <Metric
                label={SPORT_PACE_KIND[sport] === "pace" ? t("common.pace") : t("common.speed")}
                value={rate}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <SegmentList session={session} now={now} />

      {props.pickerOpen ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("mobile.changeTo")}</Text>
          <SportPicker
            testIDPrefix="change-to"
            selected={sport}
            exclude={sport}
            onPick={props.onChange}
          />
          <Button testID="btn-cancel-change" label={t("common.cancel")} kind="ghost" onPress={props.onTogglePicker} />
        </View>
      ) : (
        <Button testID="btn-change" label={t("common.change")} kind="secondary" big onPress={props.onTogglePicker} />
      )}

      <Button testID="btn-stop" label={t("common.stop")} kind="danger" big onPress={props.onStop} />
    </View>
  );
}

function SummaryScreen(props: { session: Session; onReset: () => void }) {
  const { session } = props;
  const total = sessionMetrics(session);
  const segments = segmentsFromEvents(session.events);
  // "Parar" and "Nova sessão" can occupy the same screen rect across the
  // live → summary re-render. The session is already on disk, so a double
  // tap loses nothing now — it would only skip past this summary.
  const armed = useArmedAfter(RESET_GUARD_MS);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("common.summary")}</Text>
        <Text style={styles.bigClock}>{formatDuration(durationMs(session))}</Text>
        <View style={styles.row}>
          <Metric label={t("common.distance")} value={formatDistanceForUnit(total.distanceM)} />
          <Metric label={t("common.segments")} value={String(segments.length)} />
          <Metric label={t("mobile.samples")} value={String(session.samples.length)} />
        </View>
      </View>

      <SegmentList session={session} now={Date.now()} />

      <Button
        testID="btn-new-session"
        label={t("mobile.newSession")}
        kind="primary"
        big
        disabled={!armed}
        onPress={props.onReset}
      />
    </View>
  );
}

/** Proof of persistence, nothing more: one row per stored session. Fase 4 owns the real summary. */
function HistoryScreen(props: { sessions: SessionSummary[]; now: number; onBack: () => void }) {
  const rows = [...props.sessions].reverse();
  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("mobile.history")}</Text>
        {rows.length === 0 ? <Text style={styles.hint}>{t("mobile.noSessions")}</Text> : null}
        {rows.map(({ session, discarded, sampleCount }) => {
          const segments = segmentsFromEvents(session.events);
          const status = discarded
            ? t("mobile.discarded")
            : session.status === "live"
              ? t("mobile.inProgress")
              : null;
          return (
            <View key={session.id} style={styles.segmentRow}>
              <Text style={styles.segmentLabel}>
                {formatDay(session.createdAt, locale)} · {formatClock(session.createdAt, locale)}
                {status ? ` · ${status}` : ""}
              </Text>
              <Text style={styles.segmentValue}>
                {formatDuration(durationMs(session, props.now))} · {segments.length}{" "}
                {t("common.segments").toLowerCase()} · {sampleCount} {t("mobile.samples").toLowerCase()}
              </Text>
            </View>
          );
        })}
      </View>
      <Button testID="btn-history-back" label={t("common.back")} kind="secondary" big onPress={props.onBack} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function SegmentList(props: { session: Session; now: number }) {
  const { session, now } = props;
  const segments = segmentsFromEvents(session.events);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{t("common.segments")}</Text>
      {segments.map((seg) => {
        const m = segmentMetrics(session, seg, now);
        const rate = paceOrSpeed(seg.sport, m);
        return (
          <View key={seg.index} style={styles.segmentRow}>
            <Text style={styles.segmentLabel}>
              {seg.index + 1}. {t(`sport.${seg.sport}.label`)}
              {seg.endAt === null ? t("mobile.liveSuffix") : ""}
            </Text>
            <Text style={styles.segmentValue}>
              {formatDuration(m.durationMs)} · {formatDistanceForUnit(m.distanceM)}
              {rate ? ` · ${rate}` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * One line about the GPS feed: where we are, how good the fix is, how many
 * samples are on disk. Enough for the founder to see the GPS is alive without
 * a map (ADR 0007).
 */
function GpsLine(props: { gps: GpsStatus | null; samples: number }) {
  const saved = `${props.samples} ${t("mobile.samplesSaved")}`;
  const g = props.gps;
  const status =
    g === null
      ? t("mobile.gpsSim")
      : g.kind === "fix"
        ? `${g.lat.toFixed(5)}, ${g.lng.toFixed(5)} · ±${g.accuracyM === null ? "?" : Math.round(g.accuracyM)} m` +
          (g.weak ? ` · ${t("mobile.gpsWeak")}` : "")
        : g.kind === "error"
          ? `${t("mobile.gpsUnavailable")} · ${g.message}`
          : t("mobile.gpsWaiting");
  const weak = g !== null && (g.kind === "error" || (g.kind === "fix" && g.weak));
  return (
    <Text testID="gps-line" style={[styles.gpsLine, weak && styles.gpsLineWeak]}>
      {status} · {saved}
    </Text>
  );
}

function SportPicker(props: {
  selected: Sport;
  exclude?: Sport;
  onPick: (s: Sport) => void;
  /** Distinguishes the initial-sport picker from the mid-session change-to picker in the UI tree. */
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.pickerRow}>
      {SPORTS.filter((s) => s !== props.exclude).map((s) => (
        <Chip
          key={s}
          testID={props.testIDPrefix ? `${props.testIDPrefix}-${s}` : `sport-chip-${s}`}
          label={t(`sport.${s}.label`)}
          active={s === props.selected && !props.exclude}
          onPress={() => props.onPick(s)}
        />
      ))}
    </View>
  );
}

function Chip(props: { testID: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityLabel={props.label}
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      onPress={props.onPress}
      style={({ pressed }) => [styles.chip, props.active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, props.active && styles.chipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

type ButtonKind = "primary" | "secondary" | "danger" | "ghost";

function Button(props: {
  label: string;
  kind: ButtonKind;
  big?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const box =
    props.kind === "primary"
      ? styles.btnPrimary
      : props.kind === "danger"
        ? styles.btnDanger
        : props.kind === "ghost"
          ? styles.btnGhost
          : styles.btnSecondary;
  const text =
    props.kind === "primary" ? styles.btnTextOnPrimary : styles.btnText;
  return (
    <Pressable
      testID={props.testID}
      accessibilityLabel={props.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled === true }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.btn,
        box,
        props.big && styles.btnBig,
        (pressed || props.disabled) && styles.pressed,
      ]}
    >
      <Text style={[text, props.big && styles.btnTextBig]}>{props.label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

// Edge-to-edge is mandatory on Android 16, and react-native's SafeAreaView is
// deprecated (and a no-op on Android), so pad the status bar height by hand.
// Bottom: the 3-button navigation bar is 48dp; keep the last button clear of it.
// TODO(Fase 2): react-native-safe-area-context for real insets.
const TOP_INSET = (RNStatusBar.currentHeight ?? 0) + 16;
const BOTTOM_INSET = 48 + 16;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingTop: TOP_INSET,
    paddingBottom: BOTTOM_INSET,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: { gap: 2, marginBottom: 4 },
  title: {
    color: COLORS.foreground,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  kicker: {
    color: COLORS.muted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  stack: { gap: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hint: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  liveSport: { color: COLORS.muted, fontSize: 16 },
  bigClock: {
    color: COLORS.foreground,
    fontSize: 56,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  stat: { color: COLORS.foreground, fontSize: 16 },
  gpsLine: { color: COLORS.muted, fontSize: 13, fontVariant: ["tabular-nums"] },
  gpsLineWeak: { color: "#e0a33c" },
  problem: { color: "#e0a33c", fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metric: { minWidth: 96, gap: 2 },
  metricLabel: { color: COLORS.muted, fontSize: 12 },
  metricValue: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  segmentRow: { gap: 2, paddingVertical: 4 },
  segmentLabel: { color: COLORS.foreground, fontSize: 15, fontWeight: "600" },
  segmentValue: {
    color: COLORS.muted,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.foreground, fontSize: 15, fontWeight: "600" },
  chipTextActive: { color: COLORS.background },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnBig: { paddingVertical: 20 },
  btnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.card, borderColor: COLORS.border },
  btnDanger: { backgroundColor: COLORS.background, borderColor: "#c0463f" },
  btnGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  btnText: { color: COLORS.foreground, fontSize: 16, fontWeight: "700" },
  btnTextOnPrimary: { color: COLORS.background, fontSize: 16, fontWeight: "700" },
  btnTextBig: { fontSize: 20 },
  pressed: { opacity: 0.7 },
});
