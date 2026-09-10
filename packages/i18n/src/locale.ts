import type { Dictionary } from "./dictionary";
import { en } from "./dictionaries/en";
import { ptPT } from "./dictionaries/pt-PT";
import { createTranslator, type Translator } from "./translate";

/** Every language Bricklap ships a dictionary for. English is the base. */
export const SUPPORTED_LOCALES = ["en", "pt-PT"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  "pt-PT": ptPT,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** `t()` bound to one locale's dictionary. */
export function translatorFor(locale: Locale): Translator {
  return createTranslator(getDictionary(locale));
}

/**
 * Pick the best supported locale from a list of BCP-47 candidates, most
 * preferred first (e.g. `navigator.languages`, or a single device locale
 * string). An exact match wins; otherwise the candidate's base language tag
 * (`"pt"` from `"pt-BR"`) is matched against a supported locale that starts
 * with it, so a Portuguese-speaking user not on `pt-PT` still gets Portuguese
 * copy rather than English. Falls back to `DEFAULT_LOCALE` when nothing
 * matches (including an empty or all-empty candidate list).
 */
export function resolveLocale(candidates: readonly (string | null | undefined)[]): Locale {
  for (const raw of candidates) {
    const tag = raw?.trim();
    if (!tag) continue;

    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;

    const base = tag.split(/[-_]/)[0]?.toLowerCase();
    if (!base) continue;
    const baseMatch = SUPPORTED_LOCALES.find(
      (l) => l.split("-")[0]!.toLowerCase() === base,
    );
    if (baseMatch) return baseMatch;
  }
  return DEFAULT_LOCALE;
}
