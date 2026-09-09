import { describe, expect, it } from "vitest";
import { en } from "../src/dictionaries/en";
import { ptPT } from "../src/dictionaries/pt-PT";
import { createTranslator } from "../src/translate";

describe("createTranslator", () => {
  const t = createTranslator(en);
  const tPt = createTranslator(ptPT);

  it("resolves a nested dot path to its string leaf", () => {
    expect(t("common.start")).toBe("Start");
    expect(t("sport.run.label")).toBe("Run");
    expect(t("mobile.liveSuffix")).toBe(" · live");
  });

  it("the same key resolves to a different string per dictionary", () => {
    expect(t("common.start")).toBe("Start");
    expect(tPt("common.start")).toBe("Iniciar");
    expect(t("sport.bike.live")).toBe("Riding");
    expect(tPt("sport.bike.live")).toBe("De bicicleta");
  });

  it("interpolates {placeholders} from params", () => {
    const tt = createTranslator({ ...en, watch: { ...en.watch, laps: "{n} laps" } });
    expect(tt("watch.laps", { n: 3 })).toBe("3 laps");
    expect(tt("watch.laps", { n: "many" })).toBe("many laps");
  });

  it("a placeholder with no matching param is left untouched, not silently dropped", () => {
    const tt = createTranslator({ ...en, watch: { ...en.watch, laps: "{n} laps" } });
    expect(tt("watch.laps")).toBe("{n} laps");
    expect(tt("watch.laps", { other: 1 })).toBe("{n} laps");
  });

  it("without params, a string with no placeholders passes through unchanged", () => {
    expect(t("common.done")).toBe("Done");
  });

  it("throws for a path that resolves to an object, not a string (defensive; bypasses the type)", () => {
    const anyT = t as unknown as (key: string) => string;
    expect(() => anyT("common")).toThrow(/missing translation key "common"/);
  });

  it("throws for a path that does not exist at all (defensive; bypasses the type)", () => {
    const anyT = t as unknown as (key: string) => string;
    expect(() => anyT("nope.nope")).toThrow(/missing translation key "nope\.nope"/);
  });
});
