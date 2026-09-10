import { I18nManager } from "react-native";
import { resolveLocale, translatorFor, type Locale } from "@bricklap/i18n";

/**
 * Android's `I18nManager` reports the device locale as Java's
 * `Locale#toString()` (e.g. `"pt_PT"`, `"en_US"`) — part of react-native
 * core, so this needs no new dependency (no `expo-localization`).
 * Normalize the underscore to BCP-47's hyphen before handing it to
 * `resolveLocale`, which expects tags like `"pt-PT"`.
 */
function deviceLocaleTag(): string | undefined {
  const raw = I18nManager.getConstants().localeIdentifier;
  return raw ? raw.replace(/_/g, "-") : undefined;
}

/** Detected once at app start. No settings screen yet to change it live. */
export const locale: Locale = resolveLocale([deviceLocaleTag()]);
export const t = translatorFor(locale);
