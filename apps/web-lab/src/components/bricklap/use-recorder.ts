import { useEffect, useRef } from "react";
import { currentSport } from "@/lib/afterlap/engine";
import {
  createSim,
  sampleFromGps,
  sampleFromSim,
  stepSim,
  type SimState,
} from "@/lib/afterlap/geo";
import { useAfterlap } from "@/lib/afterlap/store";
import type { Session } from "@/lib/afterlap/types";

const TICK_MS = 1000;

export function useRecorder(session: Session | null, useGps: boolean) {
  const pushSample = useAfterlap((s) => s.pushSample);
  const sim = useRef<SimState>(createSim());
  const lastTick = useRef<number>(Date.now());
  const watchId = useRef<number | null>(null);
  const sessionId = session?.id;
  const live = session?.status === "live";

  useEffect(() => {
    if (!sessionId || !live) return;
    const current = useAfterlap.getState().byId(sessionId);
    const last = current?.samples.at(-1);
    if (last) {
      sim.current = { lat: last.lat, lng: last.lng, heading: Math.PI * 0.15 };
    }
    lastTick.current = Date.now();
  }, [sessionId, live]);

  useEffect(() => {
    if (!useGps || !sessionId || !live) return;
    if (!("geolocation" in navigator)) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        pushSample(sampleFromGps(pos.coords, Date.now()));
        sim.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: sim.current.heading,
        };
        lastTick.current = Date.now();
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [useGps, sessionId, live, pushSample]);

  useEffect(() => {
    if (!sessionId || !live || useGps) return;

    const id = window.setInterval(() => {
      const liveNow = useAfterlap.getState().live();
      if (!liveNow) return;
      const sport = currentSport(liveNow.events);
      if (!sport) return;
      const t = Date.now();
      const dt = Math.min(2000, t - lastTick.current);
      lastTick.current = t;
      sim.current = stepSim(sim.current, sport, dt);
      pushSample(sampleFromSim(sim.current, sport, t));
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [sessionId, live, useGps, pushSample]);
}
