import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getDictionary,
  resolveLocale,
  translatorFor,
} from "../src/locale";

describe("resolveLocale — deteção de língua com fallback para en", () => {
  it("matches an exact supported tag, case-insensitively", () => {
    expect(resolveLocale(["pt-PT"])).toBe("pt-PT");
    expect(resolveLocale(["PT-pt"])).toBe("pt-PT");
    expect(resolveLocale(["en"])).toBe("en");
    expect(resolveLocale(["EN"])).toBe("en");
  });

  it("falls back to the base language for an unsupported region variant", () => {
    expect(resolveLocale(["pt-BR"])).toBe("pt-PT");
    expect(resolveLocale(["pt"])).toBe("pt-PT");
    expect(resolveLocale(["en-US"])).toBe("en");
    expect(resolveLocale(["en-GB"])).toBe("en");
  });

  it("tries candidates in order and stops at the first that matches", () => {
    expect(resolveLocale(["fr-FR", "pt-PT", "en"])).toBe("pt-PT");
    expect(resolveLocale(["fr-FR", "es-ES", "en-US"])).toBe("en");
  });

  it("falls back to DEFAULT_LOCALE when nothing matches", () => {
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale([null, undefined, ""])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(["fr-FR", "es-ES"])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(["xx-YY"])).toBe(DEFAULT_LOCALE);
  });

  it("skips a malformed tag with no base language (e.g. starting with '-') instead of matching it", () => {
    expect(resolveLocale(["-PT"])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(["-PT", "pt-PT"])).toBe("pt-PT");
  });

  it("DEFAULT_LOCALE is en, and SUPPORTED_LOCALES is exactly [en, pt-PT]", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES).toEqual(["en", "pt-PT"]);
  });
});

describe("getDictionary / translatorFor", () => {
  it("returns the dictionary matching the locale", () => {
    expect(getDictionary("en").common.start).toBe("Start");
    expect(getDictionary("pt-PT").common.start).toBe("Iniciar");
  });

  it("translatorFor binds t() to the right locale's dictionary", () => {
    expect(translatorFor("en")("common.stop")).toBe("Stop");
    expect(translatorFor("pt-PT")("common.stop")).toBe("Parar");
  });
});
