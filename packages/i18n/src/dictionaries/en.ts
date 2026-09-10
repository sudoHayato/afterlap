import type { Dictionary } from "../dictionary";

/**
 * Base dictionary. English is the source language of the product; every
 * other dictionary is a translation of this one and must cover the exact
 * same keys (enforced by the `Dictionary` type annotation below).
 */
export const en: Dictionary = {
  common: {
    start: "Start",
    stop: "Stop",
    change: "Change",
    cancel: "Cancel",
    done: "Done",
    home: "Home",
    back: "Back",
    discard: "Discard",
    distance: "Distance",
    pace: "Pace",
    speed: "Speed",
    segments: "Segments",
    time: "Time",
    summary: "Summary",
    phone: "Phone",
    live: "Live",
    openingSession: "Opening session…",
    watch: "Watch",
    close: "Close",
  },
  sport: {
    run: { label: "Run", live: "Running" },
    bike: { label: "Bike", live: "Riding" },
    walk: { label: "Walk", live: "Walking" },
    transition: { label: "Transition", live: "Transition" },
  },
  footer: {
    preLaunch:
      "Pre-launch. Training stays on this device. No accounts, no ads, no tracking cookies.",
    privacy: "Privacy",
    cookies: "Cookies",
    terms: "Terms",
    copyright: "Copyright",
  },
  home: {
    kicker: "Lab",
    eyebrow: "Session, not sport",
    taglineLine1: "Start once.",
    taglineLine2: "Train freely.",
    subtitle: "Change sport without stopping the session. Phone for the log. Watch for the lap.",
    liveBadge: "Live · phone",
    openWatch: "Open watch face",
    firstSport: "First sport",
    startOnWatch: "Start on watch",
    history: "History",
    noSessions: "No sessions yet.",
  },
  live: {
    noLiveSession: "No live session.",
    segment: "Segment",
    nextSportTitle: "Next sport",
    nextSportCopy: "Session stays open. Only the segment changes.",
    endSessionTitle: "End session?",
    endSessionCopy: "Every segment stays on the tape.",
    endSessionConfirm: "End session",
  },
  summary: {
    notFound: "Session not on this device.",
    segmentsOne: "segment",
    segmentsOther: "segments",
    deleteSession: "Delete session",
  },
  watch: {
    kicker: "Watch face",
    laps: "laps",
    idleHint: "Start. Lap changes sport. The session never splits.",
    disclaimer:
      "This is the watch UX — not a paired Garmin. A Fenix would run the same three actions on-device. GPS lives on the watch; the phone only reads the session.",
    liveLog: "Live log",
    lap: "Lap",
  },
  trackMap: {
    ariaLabel: "Session track",
    waitingForMovement: "Waiting for movement",
  },
  mobile: {
    kicker: "Android · Simulated GPS",
    initialSport: "Starting sport",
    idleHint:
      "Tap Start once. Then you can Change sport without stopping the clock, and Stop only at the end.",
    totalDistanceLabel: "Total distance",
    currentSegment: "Current segment",
    changeTo: "Change to…",
    newSession: "New session",
    samples: "Samples",
    liveSuffix: " · live",
  },
  meta: {
    title: "Bricklap",
    description: "Start once. Train freely. A session is a sequence of sports.",
  },
};
