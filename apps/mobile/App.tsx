/**
 * Bricklap — Android app, Fase 1 (esqueleto).
 *
 * Um único ecrã: INICIAR uma vez, MUDAR de desporto sem parar, PARAR no fim.
 * Todo o estado da sessão vive em @bricklap/engine (os eventos são a fonte de
 * verdade; segmentos e métricas são derivados).
 *
 * Nesta fase o GPS é SIMULADO (createSim / stepSim / sampleFromSim): não há
 * fornecedor de localização real, não há persistência e não há biblioteca de
 * navegação. Apenas primitivas do react-native + expo-status-bar.
 */
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SPORTS,
  SPORT_META,
  appendSample,
  applyChange,
  applyStop,
  createLiveSession,
  createSim,
  currentSport,
  durationMs,
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeedKmh,
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

function paceOrSpeed(sport: Sport, m: SegmentMetrics): string | null {
  const kind = SPORT_META[sport].paceKind;
  if (kind === "pace") return formatPace(m.distanceM, m.durationMs);
  if (kind === "speed") return formatSpeedKmh(m.avgSpeedMps);
  return null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [startSport, setStartSport] = useState<Sport>("run");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Refs so the interval callbacks never see a stale session or sim state.
  const sessionRef = useRef<Session | null>(null);
  const simRef = useRef<SimState>(createSim());
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const live = session?.status === "live";

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
    const t = Date.now();
    const dt = Math.max(0, t - lastTickRef.current);
    lastTickRef.current = t;
    simRef.current = stepSim(simRef.current, sport, dt);
    return sampleFromSim(simRef.current, sport, t);
  }, []);

  useEffect(() => {
    if (!live) return;
    lastTickRef.current = Date.now();
    const clock = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    const gps = setInterval(() => {
      const sample = tickSim();
      if (!sample) return;
      setSession((prev) => (prev ? appendSample(prev, sample) : prev));
    }, GPS_TICK_MS);
    return () => {
      clearInterval(clock);
      clearInterval(gps);
    };
  }, [live, tickSim]);

  const start = useCallback((sport: Sport) => {
    const t = Date.now();
    simRef.current = createSim();
    lastTickRef.current = t;
    const first = sampleFromSim(simRef.current, sport, t);
    const s = appendSample(createLiveSession(sport, t), first);
    sessionRef.current = s;
    setPickerOpen(false);
    setNow(t);
    setSession(s);
  }, []);

  const change = useCallback(
    (sport: Sport) => {
      // Drop a sample exactly on the boundary so distance stays continuous
      // between the segment that ends and the one that starts.
      const sample = tickSim();
      setPickerOpen(false);
      if (!sample) return;
      setSession((prev) =>
        prev ? applyChange(appendSample(prev, sample), sport, sample.t) : prev,
      );
    },
    [tickSim],
  );

  const stop = useCallback(() => {
    const sample = tickSim();
    setPickerOpen(false);
    if (!sample) return;
    setSession((prev) =>
      prev ? applyStop(appendSample(prev, sample), sample.t) : prev,
    );
  }, [tickSim]);

  const reset = useCallback(() => {
    setPickerOpen(false);
    setSession(null);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Bricklap</Text>
          <Text style={styles.kicker}>Android · GPS simulado</Text>
        </View>

        {session === null ? (
          <IdleScreen
            sport={startSport}
            onPick={setStartSport}
            onStart={() => start(startSport)}
          />
        ) : session.status === "live" ? (
          <LiveScreen
            session={session}
            now={now}
            pickerOpen={pickerOpen}
            onTogglePicker={() => setPickerOpen((v) => !v)}
            onChange={change}
            onStop={stop}
          />
        ) : (
          <SummaryScreen session={session} onReset={reset} />
        )}
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
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionLabel}>Desporto inicial</Text>
      <SportPicker selected={props.sport} onPick={props.onPick} />
      <Button label="Iniciar" kind="primary" big onPress={props.onStart} />
      <Text style={styles.hint}>
        Carrega em Iniciar uma vez. Depois podes Mudar de desporto sem parar o
        relógio e Parar apenas no fim.
      </Text>
    </View>
  );
}

function LiveScreen(props: {
  session: Session;
  now: number;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onChange: (s: Sport) => void;
  onStop: () => void;
}) {
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
        <Text style={styles.liveSport}>{SPORT_META[sport].live}</Text>
        <Text style={styles.bigClock}>
          {formatDuration(durationMs(session, now))}
        </Text>
        <Text style={styles.stat}>
          Distância total · {formatDistance(total.distanceM)}
        </Text>
      </View>

      {currentM ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Segmento atual</Text>
          <View style={styles.row}>
            <Metric label="Tempo" value={formatDuration(currentM.durationMs)} />
            <Metric label="Distância" value={formatDistance(currentM.distanceM)} />
            {rate ? (
              <Metric
                label={SPORT_META[sport].paceKind === "pace" ? "Ritmo" : "Velocidade"}
                value={rate}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <SegmentList session={session} now={now} />

      {props.pickerOpen ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Mudar para…</Text>
          <SportPicker
            selected={sport}
            exclude={sport}
            onPick={props.onChange}
          />
          <Button label="Cancelar" kind="ghost" onPress={props.onTogglePicker} />
        </View>
      ) : (
        <Button label="Mudar" kind="secondary" big onPress={props.onTogglePicker} />
      )}

      <Button label="Parar" kind="danger" big onPress={props.onStop} />
    </View>
  );
}

function SummaryScreen(props: { session: Session; onReset: () => void }) {
  const { session } = props;
  const total = sessionMetrics(session);
  const segments = segmentsFromEvents(session.events);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Resumo</Text>
        <Text style={styles.bigClock}>{formatDuration(durationMs(session))}</Text>
        <View style={styles.row}>
          <Metric label="Distância" value={formatDistance(total.distanceM)} />
          <Metric label="Segmentos" value={String(segments.length)} />
          <Metric label="Amostras" value={String(session.samples.length)} />
        </View>
      </View>

      <SegmentList session={session} now={Date.now()} />

      <Button label="Nova sessão" kind="primary" big onPress={props.onReset} />
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
      <Text style={styles.sectionLabel}>Segmentos</Text>
      {segments.map((seg) => {
        const m = segmentMetrics(session, seg, now);
        const rate = paceOrSpeed(seg.sport, m);
        return (
          <View key={seg.index} style={styles.segmentRow}>
            <Text style={styles.segmentLabel}>
              {seg.index + 1}. {SPORT_META[seg.sport].label}
              {seg.endAt === null ? " · ao vivo" : ""}
            </Text>
            <Text style={styles.segmentValue}>
              {formatDuration(m.durationMs)} · {formatDistance(m.distanceM)}
              {rate ? ` · ${rate}` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SportPicker(props: {
  selected: Sport;
  exclude?: Sport;
  onPick: (s: Sport) => void;
}) {
  return (
    <View style={styles.pickerRow}>
      {SPORTS.filter((s) => s !== props.exclude).map((s) => {
        const active = s === props.selected && !props.exclude;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => props.onPick(s)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {SPORT_META[s].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  onPress: () => void;
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
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.btn,
        box,
        props.big && styles.btnBig,
        pressed && styles.pressed,
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
const TOP_INSET = (RNStatusBar.currentHeight ?? 0) + 16;
const BOTTOM_INSET = 40;

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
