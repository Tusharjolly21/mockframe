"use client";

import type { SceneDocument } from "@framekit/scene";
import { firebaseFetch } from "./firebaseClient";

/**
 * Fonts for text layers: a curated Google Fonts catalog (loaded on demand)
 * plus fonts the user uploads (TTF / OTF / WOFF / WOFF2).
 *
 * Every face is declared as a CSS @font-face rule in a stylesheet — not only
 * through the FontFace API — because the client exporter (html-to-image)
 * embeds fonts by reading @font-face rules from document.styleSheets. A face
 * the exporter can't see renders on the canvas but falls back in the PNG.
 */

/* --------------------------------- catalog ---------------------------------- */

export type FontCategory = "Sans" | "Serif" | "Display" | "Mono" | "Handwriting";
export const FONT_CATEGORIES: FontCategory[] = ["Sans", "Serif", "Display", "Mono", "Handwriting"];

export interface CatalogFont {
  family: string;
  category: FontCategory;
  weights: number[];
  /** true italics exist at every weight above (see googleCss) */
  italics?: boolean;
}

/** Families already requested by the root layout's stylesheet link. */
const PRELOADED = new Set([
  "Inter",
  "DM Sans",
  "Manrope",
  "Outfit",
  "Sora",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "IBM Plex Sans",
  "Playfair Display",
  "Lora",
  "Merriweather",
  "JetBrains Mono",
]);

export const FONT_CATALOG: CatalogFont[] = [
  // sans
  { family: "Inter", category: "Sans", weights: [400, 500, 600, 700, 800] },
  { family: "DM Sans", category: "Sans", weights: [400, 500, 700] },
  { family: "Manrope", category: "Sans", weights: [400, 500, 600, 700, 800] },
  { family: "Outfit", category: "Sans", weights: [400, 500, 600, 700] },
  { family: "Sora", category: "Sans", weights: [400, 500, 600, 700] },
  { family: "Plus Jakarta Sans", category: "Sans", weights: [400, 500, 600, 700, 800] },
  { family: "Space Grotesk", category: "Sans", weights: [400, 500, 700] },
  { family: "IBM Plex Sans", category: "Sans", weights: [400, 500, 600, 700] },
  { family: "Poppins", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Montserrat", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Geist", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Figtree", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Onest", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Urbanist", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Lexend", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Rubik", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Work Sans", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Nunito", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Raleway", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Archivo", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Albert Sans", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Hanken Grotesk", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Schibsted Grotesk", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Red Hat Display", category: "Sans", weights: [400, 500, 600, 700, 800, 900] },
  // serif
  { family: "Playfair Display", category: "Serif", weights: [400, 600, 700] },
  { family: "Lora", category: "Serif", weights: [400, 500, 600, 700] },
  { family: "Merriweather", category: "Serif", weights: [400, 700] },
  { family: "Fraunces", category: "Serif", weights: [400, 500, 600, 700, 800, 900], italics: true },
  { family: "Instrument Serif", category: "Serif", weights: [400], italics: true },
  { family: "DM Serif Display", category: "Serif", weights: [400] },
  { family: "Libre Baskerville", category: "Serif", weights: [400, 700] },
  { family: "Cormorant Garamond", category: "Serif", weights: [400, 500, 600, 700] },
  { family: "EB Garamond", category: "Serif", weights: [400, 500, 600, 700, 800] },
  { family: "Newsreader", category: "Serif", weights: [400, 500, 600, 700, 800], italics: true },
  // display
  { family: "Bricolage Grotesque", category: "Display", weights: [400, 500, 600, 700, 800] },
  { family: "Syne", category: "Display", weights: [400, 500, 600, 700, 800] },
  { family: "Unbounded", category: "Display", weights: [400, 500, 600, 700, 800, 900] },
  { family: "Bebas Neue", category: "Display", weights: [400] },
  { family: "Anton", category: "Display", weights: [400] },
  { family: "Oswald", category: "Display", weights: [400, 500, 600, 700] },
  { family: "Archivo Black", category: "Display", weights: [400] },
  { family: "Righteous", category: "Display", weights: [400] },
  { family: "Abril Fatface", category: "Display", weights: [400] },
  // mono
  { family: "JetBrains Mono", category: "Mono", weights: [400, 600] },
  { family: "Geist Mono", category: "Mono", weights: [400, 500, 600, 700] },
  { family: "IBM Plex Mono", category: "Mono", weights: [400, 500, 600, 700] },
  { family: "Space Mono", category: "Mono", weights: [400, 700] },
  { family: "Fira Code", category: "Mono", weights: [400, 500, 600, 700] },
  // handwriting
  { family: "Caveat", category: "Handwriting", weights: [400, 500, 600, 700] },
  { family: "Kalam", category: "Handwriting", weights: [400, 700] },
  { family: "Patrick Hand", category: "Handwriting", weights: [400] },
  { family: "Permanent Marker", category: "Handwriting", weights: [400] },
  { family: "Shadows Into Light", category: "Handwriting", weights: [400] },
];

const CATALOG_BY_FAMILY = new Map(FONT_CATALOG.map((f) => [f.family, f]));

export function catalogFont(family: string): CatalogFont | undefined {
  return CATALOG_BY_FAMILY.get(family);
}

/**
 * css2 URL for a family. Families flagged `italics` also request their true
 * italic faces (`ital,wght@0,400;…;1,400;…`) so italic text isn't a synthetic
 * slant — only flag families whose italics exist at every listed weight, or
 * Google rejects the whole request.
 */
export const googleCss = (family: string, weights: number[], italics = false) => {
  const name = encodeURIComponent(family).replace(/%20/g, "+");
  const axis = italics
    ? `ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(";")}`
    : `wght@${weights.join(";")}`;
  return `https://fonts.googleapis.com/css2?family=${name}:${axis}&display=swap`;
};

const loading = new Map<string, Promise<void>>();

/**
 * Load a catalog family's full stylesheet (once). The link is crossOrigin so
 * the exporter may read its rules. Resolves when the faces are usable.
 */
export function ensureGoogleFont(family: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const font = CATALOG_BY_FAMILY.get(family);
  if (!font || PRELOADED.has(family)) return Promise.resolve();
  const hit = loading.get(family);
  if (hit) return hit;
  const p = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.crossOrigin = "anonymous";
    link.href = googleCss(family, font.weights, font.italics);
    link.dataset.mockframeFont = family;
    link.onload = () => {
      // the stylesheet only declares faces; ask for the weights so the files
      // are fetched before the next paint / export
      const styles = font.italics ? ["", "italic "] : [""];
      void Promise.all(font.weights.flatMap((w) => styles.map((st) => document.fonts.load(`${st}${w} 32px "${family}"`).catch(() => []))))
        .then(() => resolve());
    };
    link.onerror = () => resolve(); // offline: fall back silently, keep the editor usable
    document.head.appendChild(link);
  });
  loading.set(family, p);
  return p;
}

let previewsInjected = false;

/**
 * Picker previews: every catalog family rendered in its own face, without
 * downloading full fonts. Google's `text=` parameter returns tiny subsets
 * containing only the characters of the family names. They are re-declared
 * under "<family> Preview" names so they can never shadow the real faces
 * (a subset face with the real name would win for other text and drop glyphs).
 */
export async function ensurePickerPreviews(): Promise<void> {
  if (previewsInjected || typeof document === "undefined") return;
  previewsInjected = true;
  const chars = [...new Set(FONT_CATALOG.map((f) => f.family).join(""))].join("");
  const url =
    "https://fonts.googleapis.com/css2?" +
    FONT_CATALOG.map((f) => `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}`).join("&") +
    `&text=${encodeURIComponent(chars)}&display=swap`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const css = (await res.text()).replace(/font-family:\s*'([^']+)'/g, (_m, fam: string) => `font-family: '${fam} Preview'`);
    const style = document.createElement("style");
    style.dataset.mockframeFontPreviews = "1";
    style.textContent = css;
    document.head.appendChild(style);
  } catch {
    previewsInjected = false; // retry next time the picker opens
  }
}

export function previewFamily(family: string): string {
  return CATALOG_BY_FAMILY.has(family) && !PRELOADED.has(family) ? `'${family} Preview', '${family}', system-ui` : `'${family}', system-ui`;
}

/** Load every catalog font a scene's text layers use (drafts, templates, remixes). */
export function ensureSceneFonts(scene: SceneDocument): Promise<void> {
  const families = new Set<string>();
  for (const layer of scene.layers) if (layer.type === "text") families.add(layer.font.family);
  return Promise.all([...families].map((f) => ensureGoogleFont(f))).then(() => undefined);
}

/* ------------------------------- custom fonts ------------------------------- */

export interface CustomFont {
  id: string;
  family: string;
  weight: number;
  style: "normal" | "italic";
  fileName: string;
  /** data: URL of the font file — export-safe and self-contained */
  dataUrl: string;
  bytes: number;
  createdAt: number;
}

export const FONT_ACCEPT = ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
export const MAX_FONT_BYTES = 4 * 1024 * 1024;
/** fonts above this don't fit a synced cloud record and stay on this device */
export const MAX_SYNC_DATA_URL = 900_000;
const ID_RE = /^font-[a-zA-Z0-9_-]{1,80}$/;
const DATA_URL_RE = /^data:font\/(ttf|otf|woff2?);base64,[A-Za-z0-9+/]+=*$/;

/** Family names end up inside CSS strings and font-family lists: keep them plain. */
export function cleanFamily(name: string): string {
  return name.replace(/["'\\,;{}<>()\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

type FontFormat = "truetype" | "opentype" | "woff" | "woff2";

/** Identify a font by its first bytes; null for anything else. */
export function sniffFont(bytes: Uint8Array): FontFormat | null {
  if (bytes.length < 12) return null;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "wOF2") return "woff2";
  if (tag === "wOFF") return "woff";
  if (tag === "OTTO") return "opentype";
  if (tag === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return "truetype";
  return null;
}

const MIME: Record<FontFormat, string> = { truetype: "font/ttf", opentype: "font/otf", woff: "font/woff", woff2: "font/woff2" };

const WEIGHT_WORDS: Array<[RegExp, number]> = [
  [/^(thin|hairline)$/i, 100],
  [/^(extra|ultra)-?light$/i, 200],
  [/^light$/i, 300],
  [/^(regular|normal|book|roman)$/i, 400],
  [/^medium$/i, 500],
  [/^(semi|demi)-?bold$/i, 600],
  [/^bold$/i, 700],
  [/^(extra|ultra)-?bold$/i, 800],
  [/^(black|heavy)$/i, 900],
];

/** Family / weight / style from a file name like "AcmeSans-SemiBoldItalic.woff2". */
export function parseFontFileName(fileName: string): { family: string; weight: number; style: "normal" | "italic" } {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/\[.*?\]/g, "").trim();
  const parts = base.split(/[-_ ]+/).filter(Boolean);
  let weight = 400;
  let style: "normal" | "italic" = "normal";
  // trailing style token, possibly fused: "SemiBoldItalic", "BoldOblique", "Italic"
  if (parts.length > 1) {
    let last = parts[parts.length - 1];
    if (/(italic|oblique)$/i.test(last)) {
      style = "italic";
      last = last.replace(/(italic|oblique)$/i, "");
    }
    const hit = WEIGHT_WORDS.find(([re]) => re.test(last));
    if (hit) weight = hit[1];
    if (hit || last === "" || style === "italic") parts.pop();
    if (last && !hit && style === "italic") parts.push(last);
  }
  const family = (parts.join(" ") || base)
    // "AcmeSans" → "Acme Sans"
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return { family: family || "My font", weight, style };
}

/**
 * Real family / weight / italic from an uncompressed TTF/OTF: the name table
 * (typographic family 16, else family 1) and OS/2 usWeightClass + fsSelection.
 * WOFF/WOFF2 tables are compressed — callers fall back to the file name.
 */
export function readSfntMeta(buf: ArrayBuffer): { family?: string; weight?: number; italic?: boolean } {
  try {
    const v = new DataView(buf);
    const numTables = v.getUint16(4);
    const tables = new Map<string, { offset: number; length: number }>();
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(rec), v.getUint8(rec + 1), v.getUint8(rec + 2), v.getUint8(rec + 3));
      tables.set(tag, { offset: v.getUint32(rec + 8), length: v.getUint32(rec + 12) });
    }
    const out: { family?: string; weight?: number; italic?: boolean } = {};
    const os2 = tables.get("OS/2");
    if (os2 && os2.length >= 64) {
      const w = v.getUint16(os2.offset + 4);
      if (w >= 1 && w <= 1000) out.weight = Math.min(900, Math.max(100, Math.round(w / 100) * 100));
      out.italic = (v.getUint16(os2.offset + 62) & 1) === 1;
    }
    const name = tables.get("name");
    if (name) {
      const count = v.getUint16(name.offset + 2);
      const strings = name.offset + v.getUint16(name.offset + 4);
      const found: Record<number, string> = {};
      for (let i = 0; i < count; i++) {
        const r = name.offset + 6 + i * 12;
        const platform = v.getUint16(r);
        const nameId = v.getUint16(r + 6);
        if (nameId !== 1 && nameId !== 16) continue;
        const len = v.getUint16(r + 8);
        const off = strings + v.getUint16(r + 10);
        let s = "";
        if (platform === 3 || platform === 0) {
          for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(off + k));
        } else if (platform === 1) {
          for (let k = 0; k < len; k++) s += String.fromCharCode(v.getUint8(off + k));
        }
        s = s.replace(/\0/g, "").trim();
        // prefer the Windows/Unicode record; keep the first Mac one as a fallback
        if (s && (!found[nameId] || platform !== 1)) found[nameId] = s;
      }
      out.family = (found[16] || found[1])?.slice(0, 60);
    }
    return out;
  } catch {
    return {};
  }
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read the font file"));
    r.readAsDataURL(file);
  });
}

/** Read, validate and describe an uploaded font file. Does not register it. */
export async function readFontFile(file: File): Promise<CustomFont> {
  if (file.size > MAX_FONT_BYTES) throw new Error(`${file.name} is larger than ${MAX_FONT_BYTES / 1024 / 1024}MB`);
  const buf = await file.arrayBuffer();
  const format = sniffFont(new Uint8Array(buf));
  if (!format) throw new Error(`${file.name} isn't a TTF, OTF, WOFF or WOFF2 font`);
  const fromName = parseFontFileName(file.name);
  const meta = format === "truetype" || format === "opentype" ? readSfntMeta(buf) : {};
  const family = cleanFamily(meta.family || fromName.family) || "My font";
  const weight = meta.weight ?? fromName.weight;
  const style = (meta.italic ?? fromName.style === "italic") ? "italic" : "normal";
  // the browser is the final judge: a file it can't decode is rejected here,
  // not discovered later as a silent fallback on the canvas
  const probe = new FontFace(`mockframe-probe-${Date.now()}`, buf);
  try {
    await probe.load();
  } catch {
    throw new Error(`${file.name} could not be read as a font`);
  }
  const raw = await fileToDataUrl(new Blob([buf], { type: MIME[format] }));
  return {
    id: `font-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
    family,
    weight,
    style,
    fileName: file.name.slice(0, 120),
    dataUrl: raw,
    bytes: file.size,
    createdAt: Date.now(),
  };
}

const FORMAT_FROM_MIME: Record<string, string> = {
  "font/ttf": "truetype",
  "font/otf": "opentype",
  "font/woff": "woff",
  "font/woff2": "woff2",
};

function cssEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Declare (or re-declare) a custom face as a stylesheet rule. */
function injectFace(font: CustomFont): void {
  if (typeof document === "undefined") return;
  document.querySelector(`style[data-mockframe-custom-font="${font.id}"]`)?.remove();
  const mime = font.dataUrl.slice(5, font.dataUrl.indexOf(";"));
  const format = FORMAT_FROM_MIME[mime];
  const style = document.createElement("style");
  style.dataset.mockframeCustomFont = font.id;
  style.textContent =
    `@font-face{font-family:"${cssEscape(font.family)}";` +
    `src:url(${font.dataUrl})${format ? ` format("${format}")` : ""};` +
    `font-weight:${font.weight};font-style:${font.style};font-display:block;}`;
  document.head.appendChild(style);
}

function removeFace(id: string): void {
  document.querySelector(`style[data-mockframe-custom-font="${id}"]`)?.remove();
}

/* IndexedDB: font files are too big for localStorage. Own DB so the drafts
   database's schema/version is untouched. */
const DB_NAME = "framekit-fonts";
const STORE = "fonts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

const isValid = (f: Partial<CustomFont>): f is CustomFont =>
  typeof f?.id === "string" && ID_RE.test(f.id) &&
  typeof f.family === "string" && f.family.length > 0 && cleanFamily(f.family) === f.family &&
  typeof f.dataUrl === "string" && DATA_URL_RE.test(f.dataUrl) &&
  typeof f.weight === "number" && Number.isInteger(f.weight) && f.weight >= 100 && f.weight <= 900 &&
  (f.style === "normal" || f.style === "italic");

/* in-memory list + subscribers so every picker updates together */
let fonts: CustomFont[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function customFonts(): CustomFont[] {
  return fonts;
}

export function onCustomFontsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Families the user uploaded, each with the weights they have faces for. */
export function customFamilies(): { family: string; weights: number[]; faces: CustomFont[] }[] {
  const by = new Map<string, CustomFont[]>();
  for (const f of fonts) by.set(f.family, [...(by.get(f.family) ?? []), f]);
  return [...by.entries()]
    .map(([family, faces]) => ({ family, faces, weights: [...new Set(faces.map((f) => f.weight))].sort((a, b) => a - b) }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

function setFonts(next: CustomFont[]): void {
  const keep = new Set(next.map((f) => f.id));
  for (const f of fonts) if (!keep.has(f.id)) removeFace(f.id);
  for (const f of next) injectFace(f);
  fonts = next.sort((a, b) => a.createdAt - b.createdAt);
  emit();
}

let loaded: Promise<void> | null = null;

/** Register this browser's fonts, then merge the account's (call on editor mount). */
export function loadCustomFonts(): Promise<void> {
  if (loaded) return loaded;
  loaded = (async () => {
    let local: CustomFont[] = [];
    try {
      local = ((await withStore("readonly", (s) => s.getAll() as IDBRequest<CustomFont[]>)) ?? []).filter(isValid);
    } catch {
      /* private mode / IndexedDB blocked: cloud copies still load below */
    }
    setFonts(local);
    await syncFromCloud(local);
  })();
  return loaded;
}

async function syncFromCloud(local: CustomFont[]): Promise<void> {
  let cloud: CustomFont[];
  try {
    const res = await firebaseFetch("/api/custom-fonts");
    if (!res.ok) return;
    cloud = ((await res.json()) as CustomFont[]).filter(isValid);
  } catch {
    return; // offline — the local copies are the truth for now
  }
  const cloudIds = new Set(cloud.map((f) => f.id));
  const merged = [...cloud, ...local.filter((f) => !cloudIds.has(f.id))];
  setFonts(merged);
  for (const f of cloud) if (!local.some((l) => l.id === f.id)) void withStore("readwrite", (s) => s.put(f)).catch(() => {});
  // fonts added on this browser while offline (or before sync existed) go up
  for (const f of local) if (!cloudIds.has(f.id)) void pushToCloud(f);
}

async function pushToCloud(font: CustomFont): Promise<void> {
  if (font.dataUrl.length > MAX_SYNC_DATA_URL) return; // reported once, at upload
  try {
    const res = await firebaseFetch("/api/custom-fonts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(font),
    });
    if (!res.ok && res.status !== 501) {
      const j = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `${font.family} saved on this device only — ${j.error ?? "sync failed"}` }));
    }
  } catch {
    /* offline — retried on the next load */
  }
}

/** Save uploaded faces locally, declare them, and sync them to the account. */
export async function addCustomFonts(files: File[]): Promise<{ added: CustomFont[]; errors: string[] }> {
  await loadCustomFonts();
  const added: CustomFont[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const font = await readFontFile(file);
      // re-uploading the same face replaces it instead of piling up copies
      const same = fonts.find((f) => f.family === font.family && f.weight === font.weight && f.style === font.style);
      if (same) font.id = same.id;
      await withStore("readwrite", (s) => s.put(font));
      added.push(font);
      if (font.dataUrl.length > MAX_SYNC_DATA_URL) {
        errors.push(`${font.family} is too large to sync to your account — it's saved on this device`);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${file.name} could not be added`);
    }
  }
  if (added.length) {
    const ids = new Set(added.map((f) => f.id));
    setFonts([...fonts.filter((f) => !ids.has(f.id)), ...added]);
    await Promise.all(added.map((f) => document.fonts.load(`${f.style} ${f.weight} 32px "${f.family}"`).catch(() => [])));
    for (const f of added) void pushToCloud(f);
  }
  return { added, errors };
}

/** Remove every face of a family (locally and from the account). */
export async function deleteCustomFamily(family: string): Promise<void> {
  const gone = fonts.filter((f) => f.family === family);
  for (const f of gone) {
    await withStore("readwrite", (s) => s.delete(f.id)).catch(() => undefined);
    void firebaseFetch(`/api/custom-fonts/${encodeURIComponent(f.id)}`, { method: "DELETE" }).catch(() => {});
  }
  setFonts(fonts.filter((f) => f.family !== family));
}

export function isCustomFamily(family: string): boolean {
  return fonts.some((f) => f.family === family);
}

/** An uploaded family that only has italic faces (so text should be set italic). */
export function isItalicOnly(family: string): boolean {
  const faces = fonts.filter((f) => f.family === family);
  return faces.length > 0 && faces.every((f) => f.style === "italic");
}

/** Weights to offer in the weight menu for a family. */
export function weightsFor(family: string): number[] {
  const custom = customFamilies().find((c) => c.family === family);
  if (custom) return custom.weights;
  return catalogFont(family)?.weights ?? [400, 500, 600, 700, 800];
}

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};

export const weightLabel = (w: number) => WEIGHT_NAMES[w] ?? String(w);

/** The available weight closest to `weight` (ties go heavier). */
export function nearestWeight(weight: number, weights: number[]): number {
  if (!weights.length || weights.includes(weight)) return weight;
  return weights.reduce((best, w) => {
    const d = Math.abs(w - weight);
    const bd = Math.abs(best - weight);
    return d < bd || (d === bd && w > best) ? w : best;
  });
}
