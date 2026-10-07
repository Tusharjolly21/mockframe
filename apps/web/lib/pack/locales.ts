/**
 * Store listing languages a pack can be translated into. Ids are the App Store
 * Connect locale codes (also what fastlane `deliver` names its folders);
 * `play` is the matching Google Play Console code (fastlane `supply`).
 * Server-safe: used by the translate route, the compiler and the studio.
 *
 * The pack's own captions live under the "en" key and are the source text,
 * whatever language they're written in.
 */

export interface StoreLocale {
  id: string;
  label: string;
  /** the language's own name, shown under the label */
  native: string;
  play: string;
  rtl?: boolean;
}

export const SOURCE_LOCALE = "en";
/** what the source captions are assumed to be when the pack doesn't say */
export const DEFAULT_SOURCE_STORE_LOCALE = "en-US";

export const STORE_LOCALES: StoreLocale[] = [
  { id: "en-US", label: "English (US)", native: "English", play: "en-US" },
  { id: "en-GB", label: "English (UK)", native: "English", play: "en-GB" },
  { id: "en-AU", label: "English (Australia)", native: "English", play: "en-AU" },
  { id: "en-CA", label: "English (Canada)", native: "English", play: "en-CA" },
  { id: "es-ES", label: "Spanish (Spain)", native: "Español", play: "es-ES" },
  { id: "es-MX", label: "Spanish (Mexico)", native: "Español", play: "es-419" },
  { id: "fr-FR", label: "French", native: "Français", play: "fr-FR" },
  { id: "fr-CA", label: "French (Canada)", native: "Français", play: "fr-CA" },
  { id: "de-DE", label: "German", native: "Deutsch", play: "de-DE" },
  { id: "it", label: "Italian", native: "Italiano", play: "it-IT" },
  { id: "pt-BR", label: "Portuguese (Brazil)", native: "Português", play: "pt-BR" },
  { id: "pt-PT", label: "Portuguese (Portugal)", native: "Português", play: "pt-PT" },
  { id: "nl-NL", label: "Dutch", native: "Nederlands", play: "nl-NL" },
  { id: "ja", label: "Japanese", native: "日本語", play: "ja-JP" },
  { id: "ko", label: "Korean", native: "한국어", play: "ko-KR" },
  { id: "zh-Hans", label: "Chinese (Simplified)", native: "简体中文", play: "zh-CN" },
  { id: "zh-Hant", label: "Chinese (Traditional)", native: "繁體中文", play: "zh-TW" },
  { id: "hi", label: "Hindi", native: "हिन्दी", play: "hi-IN" },
  { id: "id", label: "Indonesian", native: "Bahasa Indonesia", play: "id" },
  { id: "ms", label: "Malay", native: "Bahasa Melayu", play: "ms" },
  { id: "th", label: "Thai", native: "ไทย", play: "th" },
  { id: "vi", label: "Vietnamese", native: "Tiếng Việt", play: "vi" },
  { id: "tr", label: "Turkish", native: "Türkçe", play: "tr-TR" },
  { id: "ru", label: "Russian", native: "Русский", play: "ru-RU" },
  { id: "uk", label: "Ukrainian", native: "Українська", play: "uk" },
  { id: "pl", label: "Polish", native: "Polski", play: "pl-PL" },
  { id: "cs", label: "Czech", native: "Čeština", play: "cs-CZ" },
  { id: "sk", label: "Slovak", native: "Slovenčina", play: "sk" },
  { id: "hu", label: "Hungarian", native: "Magyar", play: "hu-HU" },
  { id: "ro", label: "Romanian", native: "Română", play: "ro" },
  { id: "hr", label: "Croatian", native: "Hrvatski", play: "hr" },
  { id: "el", label: "Greek", native: "Ελληνικά", play: "el-GR" },
  { id: "sv", label: "Swedish", native: "Svenska", play: "sv-SE" },
  { id: "da", label: "Danish", native: "Dansk", play: "da-DK" },
  { id: "no", label: "Norwegian", native: "Norsk", play: "no-NO" },
  { id: "fi", label: "Finnish", native: "Suomi", play: "fi-FI" },
  { id: "ca", label: "Catalan", native: "Català", play: "ca" },
  { id: "ar-SA", label: "Arabic", native: "العربية", play: "ar", rtl: true },
  { id: "he", label: "Hebrew", native: "עברית", play: "iw-IL", rtl: true },
];

const BY_ID = new Map(STORE_LOCALES.map((l) => [l.id, l]));

export const STORE_LOCALE_IDS = STORE_LOCALES.map((l) => l.id);

export function storeLocale(id: string): StoreLocale | undefined {
  return BY_ID.get(id);
}

export function isStoreLocale(id: string): boolean {
  return BY_ID.has(id);
}

/** A few markets most apps localize for first, offered as one-click picks. */
export const POPULAR_LOCALES = ["es-ES", "fr-FR", "de-DE", "pt-BR", "ja", "ko", "zh-Hans", "it"];

/** Max languages per pack: plenty for real listings, and it bounds export time. */
export const MAX_PACK_LOCALES = 40;
