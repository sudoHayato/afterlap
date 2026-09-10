import type { Sport } from "@bricklap/engine";

/**
 * Shape of every Bricklap translation dictionary. This is a plain TypeScript
 * type (not derived with `typeof` from the `en` dictionary), so both `en.ts`
 * and `pt-PT.ts` are checked against the SAME shape independently: a key
 * missing from either file — or a stray extra key — is a compile error, not
 * a runtime surprise.
 *
 * `sport` is keyed by `Sport` on purpose: adding a fifth sport to the engine
 * forces both dictionaries to describe it before the build passes.
 */
export type Dictionary = {
  common: {
    start: string;
    stop: string;
    change: string;
    cancel: string;
    done: string;
    home: string;
    back: string;
    discard: string;
    distance: string;
    pace: string;
    speed: string;
    segments: string;
    time: string;
    summary: string;
    phone: string;
    live: string;
    openingSession: string;
    watch: string;
    close: string;
    continue: string;
  };
  sport: Record<Sport, { label: string; live: string }>;
  footer: {
    preLaunch: string;
    privacy: string;
    cookies: string;
    terms: string;
    copyright: string;
  };
  home: {
    kicker: string;
    eyebrow: string;
    taglineLine1: string;
    taglineLine2: string;
    subtitle: string;
    liveBadge: string;
    openWatch: string;
    firstSport: string;
    startOnWatch: string;
    history: string;
    noSessions: string;
  };
  live: {
    noLiveSession: string;
    segment: string;
    nextSportTitle: string;
    nextSportCopy: string;
    endSessionTitle: string;
    endSessionCopy: string;
    endSessionConfirm: string;
  };
  summary: {
    notFound: string;
    segmentsOne: string;
    segmentsOther: string;
    deleteSession: string;
  };
  watch: {
    kicker: string;
    laps: string;
    idleHint: string;
    disclaimer: string;
    liveLog: string;
    lap: string;
  };
  trackMap: {
    ariaLabel: string;
    waitingForMovement: string;
  };
  mobile: {
    kicker: string;
    initialSport: string;
    idleHint: string;
    totalDistanceLabel: string;
    currentSegment: string;
    changeTo: string;
    newSession: string;
    samples: string;
    liveSuffix: string;
    opening: string;
    history: string;
    noSessions: string;
    resumeTitle: string;
    resumeCopy: string;
    inProgress: string;
    discarded: string;
    kickerSim: string;
    gpsSource: string;
    gpsReal: string;
    gpsSim: string;
    gpsWaiting: string;
    gpsWeak: string;
    gpsUnavailable: string;
    samplesSaved: string;
    locationRationale: string;
    locationDenied: string;
    locationBlocked: string;
    locationServicesOff: string;
    openSettings: string;
    /** Picker headings: sports recorded with GPS vs. time-only ones (ADR 0008). */
    sportGroupOutdoor: string;
    sportGroupIndoor: string;
    /** Short GPS-line reasons when a GPS segment cannot get fixes mid-session. */
    gpsNoPermission: string;
    gpsServicesOff: string;
  };
  meta: {
    title: string;
    description: string;
  };
};
