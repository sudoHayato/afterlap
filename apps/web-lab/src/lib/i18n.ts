import { resolveLocale, translatorFor, type Locale } from "@bricklap/i18n";

/**
 * The lab is a client-only SPA (no SSR), so this module only ever runs in
 * the browser — but the `typeof navigator` guard keeps it safe to import
 * from a test file that runs under Node/vitest too.
 */
function candidateLocales(): string[] {
  if (typeof navigator === "undefined") return [];
  const langs = navigator.languages;
  if (langs && langs.length > 0) return Array.from(langs);
  return navigator.language ? [navigator.language] : [];
}

/** Detected once per page load. No settings screen yet to change it live. */
export const locale: Locale = resolveLocale(candidateLocales());
export const t = translatorFor(locale);
