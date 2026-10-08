/**
 * Per-browser preferences set on /account and read by the editor. Stored in
 * localStorage, so they follow the browser, not the account.
 */

export type PrefFormat = "png" | "jpeg" | "webp";
export type PrefQuality = "best" | "balanced" | "compact";

export interface Preferences {
  /** the export format the editor starts on */
  exportFormat: PrefFormat;
  /** the quality tier for JPEG and WebP */
  exportQuality: PrefQuality;
  /** save every edit to Drafts automatically */
  autosave: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { exportFormat: "png", exportQuality: "balanced", autosave: true };

const LS_KEY = "mockframe:preferences";

const FORMATS: PrefFormat[] = ["png", "jpeg", "webp"];
const QUALITIES: PrefQuality[] = ["best", "balanced", "compact"];

/** Anything stored (or hand-edited) becomes a valid Preferences, field by field. */
export function sanitizePreferences(raw: unknown): Preferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    exportFormat: FORMATS.find((f) => f === r.exportFormat) ?? DEFAULT_PREFERENCES.exportFormat,
    exportQuality: QUALITIES.find((q) => q === r.exportQuality) ?? DEFAULT_PREFERENCES.exportQuality,
    autosave: typeof r.autosave === "boolean" ? r.autosave : DEFAULT_PREFERENCES.autosave,
  };
}

export function loadPreferences(): Preferences {
  try {
    return sanitizePreferences(JSON.parse(localStorage.getItem(LS_KEY) ?? "null"));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked: the change lasts until the page closes */
  }
}
