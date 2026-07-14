"use client";

import { createId, migrateScene, type SceneDocument } from "@framekit/scene";
import { collectAssets, restoreAssets, type GuestAsset } from "./assets";
import { firebaseFetch } from "./firebaseClient";

/**
 * User scene templates (Pro): snapshot the whole composition — canvas,
 * background, effects, layer positions/transforms, text, stickers — with the
 * SCREENSHOTS stripped. Applying a template restyles the current work while
 * keeping the user's own shots in the device slots. localStorage is the
 * instant cache; Firestore (via /api/user-templates) makes them follow the
 * account, drafts-style.
 */

export interface UserTemplate {
  id: string;
  name: string;
  scene: SceneDocument;
  /** non-screenshot assets the template needs (icon stickers, bg images…) */
  assets: GuestAsset[];
  createdAt: number;
}

const LS_KEY = "mockframe:user-templates";

function loadRaw(): UserTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as UserTemplate[];
  } catch {
    return [];
  }
}

function persistLocal(list: UserTemplate[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* quota — cloud copy still exists */
  }
}

export function loadUserTemplates(): UserTemplate[] {
  const list = loadRaw();
  for (const t of list) restoreAssets(t.assets ?? []);
  return list;
}

/** Snapshot the scene as a template: screenshots out, styling assets in. */
export function templateFromScene(scene: SceneDocument, name: string): UserTemplate {
  const stripped: SceneDocument = {
    ...structuredClone(scene),
    id: createId(),
    layers: scene.layers.map((l) =>
      l.type === "mockup" ? { ...structuredClone(l), media: null, render: undefined } : structuredClone(l)
    ),
  };
  // assets still referenced after stripping: sticker images + background image
  const ids: string[] = [];
  for (const l of stripped.layers) {
    if (l.type === "sticker" && "assetId" in l) ids.push(l.assetId);
  }
  if (stripped.canvas.background.type === "image") ids.push(stripped.canvas.background.assetId);
  return {
    id: `tpl-${createId()}`,
    name: name.trim() || "My template",
    scene: stripped,
    assets: collectAssets(ids),
    createdAt: Date.now(),
  };
}

/** Apply a template to the current scene: template styling + current shots. */
export function applyTemplate(current: SceneDocument, tpl: UserTemplate): SceneDocument {
  restoreAssets(tpl.assets ?? []);
  const next = migrateScene(structuredClone(tpl.scene));
  // carry the user's screenshots over, slot by slot in z-order
  const shots = current.layers.filter((l) => l.type === "mockup" && l.media).map((l) => (l.type === "mockup" ? l.media : null));
  let i = 0;
  return {
    ...next,
    id: createId(),
    layers: next.layers.map((l) =>
      l.type === "mockup" && i < shots.length ? { ...l, media: structuredClone(shots[i++]) } : l
    ),
  };
}

export async function saveUserTemplate(tpl: UserTemplate): Promise<void> {
  const list = [tpl, ...loadRaw().filter((t) => t.id !== tpl.id)];
  persistLocal(list);
  const res = await firebaseFetch("/api/user-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tpl),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Couldn't sync the template");
  }
}

export function deleteUserTemplate(id: string): void {
  persistLocal(loadRaw().filter((t) => t.id !== id));
  void firebaseFetch(`/api/user-templates/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}

/** Cloud-first merge, drafts-style: cloud wins by id, local-only uploads. */
export async function syncUserTemplatesFromServer(): Promise<UserTemplate[]> {
  let cloud: UserTemplate[];
  try {
    const res = await firebaseFetch("/api/user-templates");
    if (!res.ok) return loadUserTemplates();
    cloud = ((await res.json()) as UserTemplate[]).filter((t) => t.scene);
  } catch {
    return loadUserTemplates();
  }
  const local = loadRaw();
  const cloudIds = new Set(cloud.map((t) => t.id));
  const merged = [...cloud, ...local.filter((t) => !cloudIds.has(t.id))].sort((a, b) => b.createdAt - a.createdAt);
  persistLocal(merged);
  for (const t of merged) restoreAssets(t.assets ?? []);
  return merged;
}
