import type { Dictionary } from "./dictionary";

/**
 * Union of every dot-separated path in `T` that resolves to a string leaf
 * (e.g. `"common.start" | "sport.run.label" | ...`). Referencing a key that
 * doesn't exist, or that points at an object instead of a string, is a
 * TypeScript error at the `t(...)` call site — not something discovered at
 * runtime or in a snapshot test.
 */
export type DictKey<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${DictKey<T[K]>}` }[keyof T &
      string];

export type TranslationKey = DictKey<Dictionary>;

function getPath(dict: Dictionary, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

/**
 * Build a `t(key, params?)` translator bound to one dictionary. `params`
 * fills `{placeholders}` in the translated string (e.g. `"{n} laps"`); a
 * placeholder with no matching param is left as-is rather than silently
 * disappearing, so a missing param is easy to spot while testing.
 */
export function createTranslator(dict: Dictionary) {
  return function t(key: TranslationKey, params?: Record<string, string | number>): string {
    const raw = getPath(dict, key);
    if (typeof raw !== "string") {
      // Unreachable through the TranslationKey type for a well-formed
      // Dictionary; kept as a guard against a dictionary built dynamically
      // (e.g. in a test) that doesn't actually satisfy the type.
      throw new Error(`@bricklap/i18n: missing translation key "${key}"`);
    }
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;
