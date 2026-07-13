"use client";

import type { Backdrop, Background, Effect, SceneDocument } from "@framekit/scene";
import { firebaseFetch } from "./firebaseClient";

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
    const local = loadSavedThemes();
    const byId = new Map(local.map((t) => [t.id, t]));
    for (const t of Array.isArray(server) ? server : []) if (!byId.has(t.id)) byId.set(t.id, t);
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
          const theme = { ...item.theme, id: item.id, shared: { shareId: item.id, role: item.role, ownerEmail: item.ownerEmail } };
          byId.set(item.id, theme);
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
  const theme: StyleTheme = {
    ...candidate,
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
