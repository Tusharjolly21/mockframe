"use client";

import type { Backdrop, Background, Effect, SceneDocument } from "@framekit/scene";

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
];

const LS_KEY = "mockframe:themes";

export function loadSavedThemes(): StyleTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as StyleTheme[]) : [];
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
    if (!Array.isArray(server)) return loadSavedThemes();
    const local = loadSavedThemes();
    const byId = new Map(local.map((t) => [t.id, t]));
    for (const t of server) if (!byId.has(t.id)) byId.set(t.id, t);
    const merged = [...byId.values()];
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
    } catch {
      /* best-effort */
    }
    return merged;
  } catch {
    return loadSavedThemes();
  }
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
