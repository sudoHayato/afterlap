import { describe, expect, it } from "vitest";
import { SPORTS } from "@bricklap/engine";
import { en } from "../src/dictionaries/en";
import { ptPT } from "../src/dictionaries/pt-PT";

function leafPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  if (obj && typeof obj === "object") {
    return Object.keys(obj as object).flatMap((k) =>
      leafPaths((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    );
  }
  return [];
}

function valueAt(dict: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node as any)?.[part], dict);
}

describe("en and pt-PT dictionaries — mesmo conjunto de chaves", () => {
  const enKeys = leafPaths(en).sort();
  const ptKeys = leafPaths(ptPT).sort();

  it("expose exactly the same keys (nothing missing, nothing extra)", () => {
    expect(ptKeys).toEqual(enKeys);
  });

  it("has more than a token number of keys (sanity: the extraction actually happened)", () => {
    expect(enKeys.length).toBeGreaterThan(40);
  });

  it("every value in both dictionaries is a non-empty string", () => {
    for (const dict of [en, ptPT] as const) {
      for (const path of leafPaths(dict)) {
        const value = valueAt(dict, path);
        expect(typeof value, `${path} should be a string`).toBe("string");
        expect((value as string).length, `${path} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("covers the sport keys the engine actually defines — all eight, gym and pool included", () => {
    expect(SPORTS).toHaveLength(8);
    for (const sport of SPORTS) {
      expect(enKeys).toContain(`sport.${sport}.label`);
      expect(enKeys).toContain(`sport.${sport}.live`);
    }
  });

  it("names the sports without GPS the way the founder asked (session 05)", () => {
    expect(en.sport.strength.label).toBe("Strength");
    expect(ptPT.sport.strength.label).toBe("Força");
    expect(en.sport.rowing_indoor.label).toBe("Indoor rowing");
    expect(ptPT.sport.rowing_indoor.label).toBe("Remo indoor");
    expect(en.sport.treadmill.label).toBe("Treadmill");
    expect(ptPT.sport.treadmill.label).toBe("Passadeira");
    expect(en.sport.swimming_pool.label).toBe("Pool swimming");
    expect(ptPT.sport.swimming_pool.label).toBe("Natação (piscina)");
  });

  it("spot-checks a key from every app surface extracted this session", () => {
    for (const key of [
      "common.start",
      "common.openingSession",
      "home.taglineLine1",
      "live.endSessionConfirm",
      "summary.segmentsOne",
      "watch.disclaimer",
      "trackMap.waitingForMovement",
      "mobile.idleHint",
      "meta.description",
    ]) {
      expect(enKeys).toContain(key);
    }
  });

  it("pt-PT keeps the mobile wording the Android app already shipped in session 01", () => {
    expect(ptPT.common.start).toBe("Iniciar");
    expect(ptPT.common.change).toBe("Mudar");
    expect(ptPT.common.stop).toBe("Parar");
    expect(ptPT.mobile.newSession).toBe("Nova sessão");
    expect(ptPT.mobile.idleHint).toBe(
      "Carrega em Iniciar uma vez. Depois podes Mudar de desporto sem parar o relógio e Parar apenas no fim.",
    );
  });
});

describe("recording notification (ADR 0010) — placeholders present in both languages", () => {
  it("title takes only {sport}; body takes only {startedAt} — no elapsed time", () => {
    for (const dict of [en, ptPT] as const) {
      expect(dict.mobile.recordingNotificationTitle).toContain("{sport}");
      expect(dict.mobile.recordingNotificationBody).toContain("{startedAt}");
      // A clock in a text refreshed only at START / CHANGE / resume would sit
      // frozen; the founder read "Caminhada · 00:00" as broken (session 09).
      for (const text of [dict.mobile.recordingNotificationTitle, dict.mobile.recordingNotificationBody]) {
        expect(text).not.toContain("{elapsed}");
        expect(text).not.toContain("{updatedAt}");
      }
    }
  });
});
