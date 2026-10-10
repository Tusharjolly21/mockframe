"use client";

import type { Backdrop, Background, Effect, SceneDocument } from "@framekit/scene";
import { firebaseFetch } from "./firebaseClient";
import { parseTheme } from "./themeSchema";

/**
 * Saved style Themes (PostSpark's "Sand Light · Save"): a named snapshot of the
 * canvas STYLING — background + backdrop + effects + border — that applies to
 * any scene without touching its layers/media. Built-ins ship with the app;
 * user-saved themes persist in localStorage.
 */

export interface StyleTheme {
  id: string;
  name: string;
  background: Background;
  backdrop?: Backdrop;
  effects?: Effect[];
  cornerRadius?: number;
  border?: { width: number; color: string };
  /** built-ins can't be deleted */
  builtin?: boolean;
  /** which shelf a built-in sits on in the Themes popover */
  collection?: "essentials" | "studio" | "editorial" | "night";
  shared?: { shareId: string; role: "read" | "contribute"; ownerEmail?: string | null };
}

export interface ThemeExportFile {
  format: "mockframe-theme";
  version: 1;
  exportedAt: string;
  theme: StyleTheme;
}

/** PostSpark-inspired starter themes (they ship Sand Light/Dark, Midnight, Neon). */
export const BUILTIN_THEMES: StyleTheme[] = [
  {
    id: "sand-light",
    name: "Sand Light",
    builtin: true,
    background: { type: "linear-gradient", angle: 135, stops: [{ at: 0, color: "#f6ead9" }, { at: 1, color: "#e5cfb4" }] },
    effects: [{ type: "grain", intensity: 0.25, seed: 7 }],
  },
  {
    id: "sand-dark",
    name: "Sand Dark",
    builtin: true,
    background: { type: "linear-gradient", angle: 135, stops: [{ at: 0, color: "#3b2f24" }, { at: 1, color: "#17110b" }] },
    effects: [{ type: "vignette", intensity: 0.4, color: "#000000" }, { type: "grain", intensity: 0.3, seed: 3 }],
  },
  {
    id: "midnight",
    name: "Midnight",
    builtin: true,
    background: { type: "radial-gradient", cx: 0.5, cy: 0.32, stops: [{ at: 0, color: "#1b2550" }, { at: 1, color: "#05070f" }] },
    backdrop: { overlay: { kind: "spotlight", intensity: 0.5 } },
    effects: [{ type: "noise", intensity: 0.3, monochrome: true }],
  },
  {
    id: "neon",
    name: "Neon",
    builtin: true,
    background: { type: "linear-gradient", angle: 120, stops: [{ at: 0, color: "#ff2ec4" }, { at: 0.55, color: "#7b2eff" }, { at: 1, color: "#2e5bff" }] },
    backdrop: { pattern: { kind: "grid", intensity: 0.25, thickness: 0.3, color: "#ffffff" } },
    effects: [{ type: "grain", intensity: 0.35, seed: 11 }],
  },
  {
    id: "paper",
    name: "Paper",
    builtin: true,
    background: { type: "solid", color: "#f6f6f2" },
    backdrop: { pattern: { kind: "dots", intensity: 0.35, thickness: 0.25, color: "#b9b6ac" } },
    cornerRadius: 24,
  },
  {
    id: "studio",
    name: "Studio",
    builtin: true,
    background: { type: "radial-gradient", cx: 0.5, cy: 0.28, stops: [{ at: 0, color: "#3e4250" }, { at: 1, color: "#15161c" }] },
    backdrop: { portrait: { mode: "stage", position: 50, distance: 55 }, overlay: { kind: "top-light", intensity: 0.55 } },
  },
].map((t) => ({ ...t, collection: "essentials" as const })) as StyleTheme[];

const stops = (...colors: string[]) => colors.map((color, i) => ({ at: colors.length === 1 ? 0 : i / (colors.length - 1), color }));

/**
 * Art-directed multi-layer looks: each one stacks a rich base, a cast-light
 * overlay, a texture or pattern, grain and a vignette so the result reads as a
 * designed set, not a flat fill. Pure CSS/SVG, so they export identically.
 */
export const PREMIUM_THEMES: StyleTheme[] = [
  {
    id: "p-holo-foil", name: "Holo Foil", builtin: true, collection: "studio",
    background: { type: "conic-gradient", angle: 20, cx: 0.5, cy: 0.5, stops: stops("#c4b5fd", "#f9a8d4", "#fde68a", "#86efac", "#7dd3fc", "#c4b5fd") },
    backdrop: { overlay: { kind: "gloss-sweep", intensity: 0.6 }, pattern: { kind: "noise", intensity: 0.5, thickness: 0.5, color: "#ffffff" } },
    effects: [{ type: "grain", intensity: 0.2, seed: 5 }],
  },
  {
    id: "p-golden-hour", name: "Golden Hour", builtin: true, collection: "studio",
    background: { type: "linear-gradient", angle: 160, stops: stops("#fff1d6", "#ffc98a", "#f08a5d", "#b5476b") },
    backdrop: { overlay: { kind: "light-leak", intensity: 0.55 } },
    effects: [{ type: "grain", intensity: 0.3, seed: 12 }, { type: "vignette", intensity: 0.25, color: "#3b0d1e" }],
  },
  {
    id: "p-glass-prism", name: "Glass Prism", builtin: true, collection: "studio",
    background: { type: "radial-gradient", cx: 0.3, cy: 0.2, stops: stops("#2d3a73", "#141a3a", "#070a1a") },
    backdrop: { overlay: { kind: "prism", intensity: 0.75 }, pattern: { kind: "hex", intensity: 0.2, thickness: 0.35, color: "#a5b4fc", blendMode: "soft-light" } },
    effects: [{ type: "grain", intensity: 0.25, seed: 21 }, { type: "vignette", intensity: 0.4, color: "#000000" }],
  },
  {
    id: "p-pool-light", name: "Pool Light", builtin: true, collection: "studio",
    background: { type: "linear-gradient", angle: 170, stops: stops("#7fe3e0", "#1aa3b8", "#0b5d7a") },
    backdrop: { overlay: { kind: "caustics", intensity: 0.6 } },
    effects: [{ type: "grain", intensity: 0.15, seed: 4 }],
  },
  {
    id: "p-aurora-veil", name: "Aurora Veil", builtin: true, collection: "night",
    background: { type: "mesh-gradient", seed: 41, colors: ["#04121a", "#0e7490", "#34d399", "#4c1d95"] },
    backdrop: { overlay: { kind: "god-rays", intensity: 0.45 } },
    effects: [{ type: "grain", intensity: 0.3, seed: 8 }, { type: "vignette", intensity: 0.45, color: "#000000" }],
  },
  {
    id: "p-obsidian-gold", name: "Obsidian & Gold", builtin: true, collection: "night",
    background: { type: "radial-gradient", cx: 0.5, cy: 0.28, stops: stops("#2b2b33", "#0f0f14", "#050507") },
    backdrop: { overlay: { kind: "lens-bloom", intensity: 0.45 }, pattern: { kind: "plus-grid", intensity: 0.3, thickness: 0.35, color: "#d4af37", blendMode: "soft-light" } },
    effects: [{ type: "grain", intensity: 0.3, seed: 2 }, { type: "vignette", intensity: 0.5, color: "#000000" }],
    border: { width: 2, color: "rgba(212,175,55,0.35)" },
  },
  {
    id: "p-neon-noir", name: "Neon Noir", builtin: true, collection: "night",
    background: { type: "linear-gradient", angle: 140, stops: stops("#12001f", "#2a0a55", "#7a1fa2", "#ff3d9a") },
    backdrop: { pattern: { kind: "scanlines", intensity: 0.28, thickness: 0.45, color: "#000000", blendMode: "multiply" }, overlay: { kind: "prism", intensity: 0.35 } },
    effects: [{ type: "grain", intensity: 0.28, seed: 31 }, { type: "vignette", intensity: 0.5, color: "#0a0014" }],
  },
  {
    id: "p-deep-ocean", name: "Deep Ocean", builtin: true, collection: "night",
    background: { type: "linear-gradient", angle: 175, stops: stops("#06324a", "#06192b", "#020812") },
    backdrop: { overlay: { kind: "caustics", intensity: 0.3 }, portrait: { mode: "stage", position: 50, distance: 60 } },
    effects: [{ type: "vignette", intensity: 0.45, color: "#000000" }, { type: "grain", intensity: 0.22, seed: 14 }],
  },
  {
    id: "p-editorial-paper", name: "Editorial Paper", builtin: true, collection: "editorial",
    background: { type: "solid", color: "#f4efe6" },
    backdrop: { pattern: { kind: "halftone", intensity: 0.22, thickness: 0.4, color: "#9b8f7a", blendMode: "multiply" }, overlay: { kind: "window", intensity: 0.28 } },
    effects: [{ type: "grain", intensity: 0.4, seed: 17 }],
    cornerRadius: 18,
  },
  {
    id: "p-terrazzo-pop", name: "Terrazzo Pop", builtin: true, collection: "editorial",
    background: { type: "solid", color: "#f3ece1" },
    backdrop: { pattern: { kind: "terrazzo", intensity: 0.85, thickness: 0.55, color: "#e8836b", seed: 211, paletteSeed: 1 }, overlay: { kind: "top-light", intensity: 0.3 } },
    effects: [{ type: "grain", intensity: 0.22, seed: 6 }],
  },
  {
    id: "p-blueprint", name: "Blueprint", builtin: true, collection: "editorial",
    background: { type: "linear-gradient", angle: 160, stops: stops("#17408b", "#0e2c66") },
    backdrop: { pattern: { kind: "isometric", intensity: 0.32, thickness: 0.4, color: "#bcd4ff", blendMode: "soft-light" }, overlay: { kind: "top-light", intensity: 0.3 } },
    effects: [{ type: "vignette", intensity: 0.3, color: "#031233" }],
  },
  {
    id: "p-soft-ceramic", name: "Soft Ceramic", builtin: true, collection: "editorial",
    background: { type: "linear-gradient", angle: 150, stops: stops("#f6f1ee", "#e8dcd6", "#d9c6bf") },
    backdrop: { overlay: { kind: "gloss-sweep", intensity: 0.55 }, portrait: { mode: "stage", position: 50, distance: 50 } },
    effects: [{ type: "grain", intensity: 0.2, seed: 9 }],
    cornerRadius: 28,
  },
  {
    id: "p-sunset-film", name: "Sunset Film", builtin: true, collection: "editorial",
    background: { type: "mesh-gradient", seed: 77, colors: ["#ffb199", "#ff6a88", "#7f5af0", "#2a1b5e"] },
    backdrop: { overlay: { kind: "light-leak", intensity: 0.5 } },
    effects: [{ type: "grain", intensity: 0.4, seed: 23 }, { type: "vignette", intensity: 0.3, color: "#1a0b2e" }],
  },
  {
    id: "p-chrome-liquid", name: "Liquid Chrome", builtin: true, collection: "studio",
    background: { type: "conic-gradient", angle: 310, cx: 0.5, cy: 0.4, stops: stops("#0b0b10", "#6b7280", "#f3f4f6", "#374151", "#d1d5db", "#0b0b10") },
    backdrop: { overlay: { kind: "gloss-sweep", intensity: 0.7 } },
    effects: [{ type: "grain", intensity: 0.18, seed: 3 }, { type: "vignette", intensity: 0.35, color: "#000000" }],
  },
];

/** Every theme that ships with the app, essentials first. */
export const ALL_BUILTIN_THEMES: StyleTheme[] = [...BUILTIN_THEMES, ...PREMIUM_THEMES];

export const THEME_COLLECTIONS: { id: NonNullable<StyleTheme["collection"]>; label: string; blurb: string }[] = [
  { id: "studio", label: "Studio", blurb: "Glass, foil and light" },
  { id: "night", label: "Night", blurb: "Dark, moody, cinematic" },
  { id: "editorial", label: "Editorial", blurb: "Paper, print and colour" },
  { id: "essentials", label: "Essentials", blurb: "Clean starting points" },
];

const LS_KEY = "mockframe:themes";

export function loadSavedThemes(): StyleTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    // rebuilt from validated pieces: a corrupt or hand-edited entry is skipped instead of crashing the theme panel
    return Array.isArray(parsed) ? parsed.map(parseTheme).filter((t): t is StyleTheme => !!t && !t.builtin) : [];
  } catch {
    return [];
  }
}

function persist(themes: StyleTheme[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(themes));
  } catch {
    /* quota/priv-mode — saving is best-effort */
  }
  // server persistence (survives cleared storage / other browsers) — best-effort
  fetch("/api/store/themes", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(themes),
  }).catch(() => {});
}

/** Merge server-saved themes into localStorage (server wins on new ids). */
export async function syncThemesFromServer(): Promise<StyleTheme[]> {
  try {
    const r = await fetch("/api/store/themes");
    const server = (await r.json()) as StyleTheme[] | null;
    const local = loadSavedThemes();
    const byId = new Map(local.map((t) => [t.id, t]));
    for (const raw of Array.isArray(server) ? server : []) {
      const t = parseTheme(raw);
      if (t && !t.builtin && !byId.has(t.id)) byId.set(t.id, t);
    }
    const merged = [...byId.values()];
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
    } catch {
      /* best-effort */
    }
    try {
      const sharedResponse = await firebaseFetch("/api/themes/share");
      if (sharedResponse.ok) {
        const shared = (await sharedResponse.json()) as { id: string; theme: StyleTheme; role: "read" | "contribute"; ownerEmail?: string | null }[];
        for (const item of shared) {
          const checked = parseTheme({ ...item.theme, id: item.id });
          if (!checked) continue;
          byId.set(item.id, { ...checked, builtin: false, shared: { shareId: item.id, role: item.role, ownerEmail: item.ownerEmail } });
        }
      }
    } catch {
      /* signed-out users still get local themes */
    }
    const withShared = [...byId.values()];
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(withShared));
    } catch {
      /* best-effort */
    }
    return withShared;
  } catch {
    return loadSavedThemes();
  }
}

export async function createSharedTheme(theme: StyleTheme, email: string, role: "read" | "contribute") {
  const response = await firebaseFetch("/api/themes/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ theme, name: theme.name, email, role }),
  });
  const body = (await response.json()) as { id?: string; shareUrl?: string; error?: string };
  if (!response.ok) throw new Error(body.error || "Could not share this theme.");
  return body as { id: string; shareUrl: string };
}

export async function updateSharedTheme(shareId: string, theme: StyleTheme, email?: string, role?: "read" | "contribute") {
  const response = await firebaseFetch(`/api/themes/share/${encodeURIComponent(shareId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ theme, email, role }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Could not update the shared theme.");
}

/** Snapshot the current canvas styling as a named theme and persist it. */
export function saveTheme(scene: SceneDocument, name: string): StyleTheme {
  const { background, backdrop, effects, cornerRadius, border } = scene.canvas;
  const theme: StyleTheme = {
    id: `t_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name.trim() || "My theme",
    background,
    backdrop,
    effects,
    cornerRadius,
    border,
  };
  persist([...loadSavedThemes(), theme]);
  return theme;
}

export function deleteTheme(id: string) {
  persist(loadSavedThemes().filter((t) => t.id !== id));
}

/** Download one theme as a portable, human-readable JSON file. */
export function exportTheme(theme: StyleTheme) {
  if (typeof window === "undefined") return;
  const payload: ThemeExportFile = {
    format: "mockframe-theme",
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: { ...theme, builtin: false },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.theme.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mockframe-theme"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function isTheme(value: unknown): value is StyleTheme {
  if (!value || typeof value !== "object") return false;
  const theme = value as Partial<StyleTheme>;
  return typeof theme.name === "string" && !!theme.background && typeof theme.background === "object";
}

/** Import a theme export, normalize its identity, and persist it locally/server-side. */
export async function importThemeFile(file: File): Promise<StyleTheme> {
  const raw = JSON.parse(await file.text()) as Partial<ThemeExportFile> | StyleTheme;
  const isEnvelope = !!raw && typeof raw === "object" && "theme" in raw;
  const candidate = isEnvelope ? (raw as Partial<ThemeExportFile>).theme : raw;
  if ((isEnvelope && (raw as Partial<ThemeExportFile>).format !== "mockframe-theme") || !isTheme(candidate)) {
    throw new Error("This is not a valid MockFrame theme file.");
  }
  // an export has no id of its own to keep; validate the rest before it can reach the panel
  const checked = parseTheme({ ...candidate, id: "imported" });
  if (!checked) throw new Error("This theme file has an unsupported background.");
  const theme: StyleTheme = {
    ...checked,
    id: `t_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: candidate.name.trim() || "Imported theme",
    builtin: false,
  };
  persist([...loadSavedThemes(), theme]);
  return theme;
}

/** Apply a theme's styling — layers, media and canvas size stay untouched. */
export function applyTheme(scene: SceneDocument, t: StyleTheme): SceneDocument {
  return {
    ...scene,
    canvas: {
      ...scene.canvas,
      background: t.background,
      backdrop: t.backdrop,
      effects: t.effects,
      cornerRadius: t.cornerRadius,
      border: t.border,
    },
  };
}

/** Does the current canvas styling match this theme? (drives the active label) */
export function themeMatches(scene: SceneDocument, t: StyleTheme): boolean {
  const c = scene.canvas;
  return (
    JSON.stringify(c.background) === JSON.stringify(t.background) &&
    JSON.stringify(c.backdrop ?? null) === JSON.stringify(t.backdrop ?? null) &&
    JSON.stringify(c.effects ?? null) === JSON.stringify(t.effects ?? null)
  );
}
