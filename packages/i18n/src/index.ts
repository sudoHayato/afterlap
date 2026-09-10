/**
 * @bricklap/i18n — shared translation dictionaries and unit formatting.
 *
 * Pure TypeScript, no platform APIs (no DOM, no React Native). Each app is
 * responsible for gathering its own locale candidates (`navigator.languages`
 * on the web, a native locale API on the phone) and passing them to
 * `resolveLocale`.
 */
export type { Dictionary } from "./dictionary";
export { en } from "./dictionaries/en";
export { ptPT } from "./dictionaries/pt-PT";
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getDictionary,
  resolveLocale,
  translatorFor,
  type Locale,
} from "./locale";
export { createTranslator, type DictKey, type TranslationKey, type Translator } from "./translate";
export {
  DEFAULT_UNIT_SYSTEM,
  UNIT_SYSTEMS,
  formatDistanceForUnit,
  formatPaceForUnit,
  formatSpeedForUnit,
  type UnitSystem,
} from "./units";
