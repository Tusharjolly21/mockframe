// Mockframe for Figma. This side reads the selection, exports frames and
// places finished images on the page; the UI (ui.html) talks to Mockframe.
// Commands: "open" shows the panel (also the relaunch button), "quick" makes
// mockups of the selection with the saved settings and no panel.

const MAX_FRAMES = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const THUMB_W = 160;
const SIZE = { width: 360, height: 620 };
const MIN_SIZE = { width: 320, height: 460 };
const MAX_SIZE = { width: 800, height: 1100 };
const SECTION_NAME = "Mockframe mockups";
const PAD = 80;
const GAP = 80;
// frames inside a selected section or group
const FRAME_TYPES = ["FRAME", "COMPONENT", "INSTANCE", "COMPONENT_SET"];

const quick = figma.command === "quick";
figma.showUI(__html__, { width: SIZE.width, height: SIZE.height, themeColors: true, visible: !quick });
let quickNote = quick ? figma.notify("Making mockups with Mockframe…", { timeout: Infinity }) : null;

function usable(node) {
  return "exportAsync" in node && node.visible !== false && node.width > 0 && node.height > 0;
}

/** The selection, with sections and groups opened up to the frames directly inside them. */
function candidates() {
  const out = [];
  const seen = {};
  const add = (node) => {
    if (seen[node.id] || !usable(node)) return;
    seen[node.id] = true;
    out.push(node);
  };
  for (const node of figma.currentPage.selection) {
    if (node.type === "SECTION" || node.type === "GROUP") {
      const inside = node.children.filter((c) => FRAME_TYPES.indexOf(c.type) >= 0 && usable(c));
      if (inside.length) {
        inside.forEach(add);
        continue;
      }
    }
    add(node);
  }
  return out;
}

const meta = (node) => ({ id: node.id, name: node.name, width: Math.round(node.width), height: Math.round(node.height) });

let describing = 0;
async function describe() {
  const run = ++describing;
  const all = candidates();
  const nodes = all.slice(0, MAX_FRAMES);
  const frames = [];
  for (const node of nodes) {
    let thumb = null;
    try {
      thumb = await node.exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: THUMB_W } });
    } catch (e) {
      thumb = null;
    }
    // a newer selection change started while this one was exporting
    if (run !== describing) return;
    const m = meta(node);
    m.thumb = thumb;
    frames.push(m);
  }
  figma.ui.postMessage({ type: "selection", frames, more: Math.max(0, all.length - MAX_FRAMES) });
}

// Export at the chosen scale; fall back to 1x, then JPEG, to stay under the upload limit.
async function exportFrame(node, scale) {
  const tries = [
    { format: "PNG", scale },
    { format: "PNG", scale: 1 },
    { format: "JPG", scale: 1 },
  ];
  for (const t of tries) {
    if (t.scale > scale) continue;
    const bytes = await node.exportAsync({ format: t.format, constraint: { type: "SCALE", value: t.scale } });
    if (bytes.length <= MAX_BYTES) {
      return { bytes, width: Math.round(node.width * t.scale), height: Math.round(node.height * t.scale) };
    }
  }
  throw new Error(`"${node.name}" is too big to send. Try a smaller frame.`);
}

async function exportFrames(msg) {
  const out = [];
  for (let i = 0; i < msg.ids.length; i++) {
    const node = await figma.getNodeByIdAsync(msg.ids[i]);
    if (!node || !("exportAsync" in node)) throw new Error("A selected frame was deleted. Select the frames again.");
    figma.ui.postMessage({ type: "progress", step: "export", done: i, total: msg.ids.length });
    const f = await exportFrame(node, msg.scale === 1 ? 1 : 2);
    out.push({ name: node.name, width: f.width, height: f.height, bytes: f.bytes });
  }
  return out;
}

/* ------------------------------ placing results ----------------------------- */

// Placed frames are remembered on the document, per import and slot, so a
// design sent again swaps the image of the frame it went into before.
const recordKey = (importId, n) => `mf:${importId}:${n}`;
const sectionKey = (importId) => `mf:${importId}:section`;

function readRecord(key) {
  const raw = figma.root.getPluginData(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function pageOf(node) {
  let n = node;
  while (n && n.type !== "PAGE") n = n.parent;
  return n;
}

async function liveNode(id, type) {
  if (!id) return null;
  const node = await figma.getNodeByIdAsync(id);
  return node && !node.removed && node.type === type ? node : null;
}

/** Slot → version of everything already placed for an import. */
function known(importId) {
  const prefix = `mf:${importId}:`;
  const versions = {};
  for (const key of figma.root.getPluginDataKeys()) {
    if (key.indexOf(prefix) !== 0 || key === sectionKey(importId)) continue;
    const rec = readRecord(key);
    if (rec) versions[key.slice(prefix.length)] = rec.version;
  }
  return versions;
}

/** Where a new section goes: right of the frames the images came from, or the middle of the view. */
async function anchorBox(ids) {
  let box = null;
  for (const id of ids || []) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node || node.removed || pageOf(node) !== figma.currentPage || !node.absoluteBoundingBox) continue;
    const b = node.absoluteBoundingBox;
    if (!box) box = { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
    else {
      box.x = Math.min(box.x, b.x);
      box.y = Math.min(box.y, b.y);
      box.right = Math.max(box.right, b.x + b.width);
      box.bottom = Math.max(box.bottom, b.y + b.height);
    }
  }
  return box;
}

function fitSection(section) {
  let right = 0;
  let bottom = 0;
  for (const child of section.children) {
    right = Math.max(right, child.x + child.width);
    bottom = Math.max(bottom, child.y + child.height);
  }
  section.resizeWithoutConstraints(Math.max(200, Math.round(right + PAD)), Math.max(200, Math.round(bottom + PAD)));
}

async function place(msg) {
  const page = figma.currentPage;
  const created = [];
  const updated = [];
  let section = await liveNode(figma.root.getPluginData(sectionKey(msg.importId)), "SECTION");
  if (section && pageOf(section) !== page) section = null;
  let newSection = false;

  for (const item of msg.items) {
    const image = figma.createImage(item.bytes);
    const scale = item.scale > 0 ? item.scale : 2;
    const w = Math.max(1, Math.round(item.width / scale));
    const h = Math.max(1, Math.round(item.height / scale));
    const fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
    const name = `Mockframe · ${item.name}`;
    const record = { importId: msg.importId, n: item.n, version: item.version };
    const key = recordKey(msg.importId, item.n);
    const prev = readRecord(key);
    const existing = prev ? await liveNode(prev.node, "FRAME") : null;

    if (existing) {
      if (prev.version >= item.version) continue;
      existing.fills = fills;
      if (Math.round(existing.width) !== w || Math.round(existing.height) !== h) existing.resizeWithoutConstraints(w, h);
      existing.name = name;
      existing.setPluginData("mockframe", JSON.stringify(record));
      figma.root.setPluginData(key, JSON.stringify({ node: existing.id, version: item.version }));
      if (existing.parent && existing.parent.type === "SECTION") fitSection(existing.parent);
      updated.push(existing);
      continue;
    }

    if (!section) {
      section = figma.createSection();
      section.name = SECTION_NAME;
      page.appendChild(section);
      newSection = true;
      figma.root.setPluginData(sectionKey(msg.importId), section.id);
    }
    const frame = figma.createFrame();
    frame.name = name;
    frame.resizeWithoutConstraints(w, h);
    frame.fills = fills;
    frame.clipsContent = true;
    let x = PAD;
    for (const child of section.children) x = Math.max(x, child.x + child.width + GAP);
    section.appendChild(frame);
    frame.x = x;
    frame.y = PAD;
    frame.setPluginData("mockframe", JSON.stringify(record));
    frame.setRelaunchData({ open: "Made with Mockframe. Make more mockups or send these again." });
    figma.root.setPluginData(key, JSON.stringify({ node: frame.id, version: item.version }));
    created.push(frame);
  }

  if (section && created.length) {
    fitSection(section);
    section.setRelaunchData({ open: "Mockups made with Mockframe" });
    if (newSection) {
      const box = await anchorBox(msg.anchorIds);
      if (box) {
        section.x = Math.round(box.right + 160);
        section.y = Math.round(box.y);
      } else {
        section.x = Math.round(figma.viewport.center.x - section.width / 2);
        section.y = Math.round(figma.viewport.center.y - section.height / 2);
      }
    }
  }

  const shown = created.concat(updated).filter((n) => pageOf(n) === page);
  if (shown.length) {
    page.selection = shown;
    figma.viewport.scrollAndZoomIntoView(shown);
  }
  return { created: created.length, updated: updated.length };
}

/* ---------------------------------- messages --------------------------------- */

function clampSize(width, height) {
  return {
    width: Math.round(Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, Number(width) || SIZE.width))),
    height: Math.round(Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, Number(height) || SIZE.height))),
  };
}

async function handle(msg) {
  if (msg.type === "export") return { frames: await exportFrames(msg) };
  if (msg.type === "place") return place(msg);
  if (msg.type === "known") return { versions: known(msg.importId) };
  if (msg.type === "open") {
    // only ever open our own site, whatever the UI frame asks for
    const target = typeof msg.url === "string" ? msg.url : "";
    if (!/^https:\/\/(www\.)?mockframe\.app(\/|$)/.test(target)) return { opened: false };
    figma.openExternal(target);
    return { opened: true };
  }
  return null;
}

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "ready") {
    const prefs = await figma.clientStorage.getAsync("prefs");
    const size = await figma.clientStorage.getAsync("size");
    if (size && !quick) {
      const s = clampSize(size.width, size.height);
      figma.ui.resize(s.width, s.height);
    }
    figma.ui.postMessage({ type: "init", command: quick ? "quick" : "open", prefs: prefs || null, frames: quick ? candidates().slice(0, MAX_FRAMES).map(meta) : null });
    if (!quick) await describe();
  } else if (msg.type === "save-prefs") {
    await figma.clientStorage.setAsync("prefs", msg.prefs);
  } else if (msg.type === "resize") {
    const s = clampSize(msg.width, msg.height);
    figma.ui.resize(s.width, s.height);
    if (msg.done) await figma.clientStorage.setAsync("size", s);
  } else if (msg.type === "notify") {
    figma.notify(String(msg.text || ""), { error: !!msg.error, timeout: msg.error ? 6000 : 3000 });
  } else if (msg.type === "close") {
    if (quickNote) quickNote.cancel();
    quickNote = null;
    if (msg.error) {
      figma.notify(String(msg.text || "Something went wrong"), { error: true, timeout: 8000 });
      figma.closePlugin();
    } else {
      figma.closePlugin(msg.text ? String(msg.text) : undefined);
    }
  } else if (msg.req) {
    // a request from the UI that expects an answer
    try {
      const result = await handle(msg);
      figma.ui.postMessage({ type: "reply", req: msg.req, result });
    } catch (e) {
      figma.ui.postMessage({ type: "reply", req: msg.req, error: e instanceof Error ? e.message : String(e) });
    }
  }
};

if (!quick) {
  figma.on("selectionchange", () => void describe());
  figma.on("currentpagechange", () => void describe());
}
