// Mockframe for Figma: send the selected frames into a Mockframe scene or
// store listing set. This side reads the selection and exports images; the
// UI (ui.html) uploads them and opens the editor.

const MAX_FRAMES = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const THUMB_W = 120;

figma.showUI(__html__, { width: 340, height: 560, themeColors: true });

function exportable() {
  return figma.currentPage.selection.filter((n) => "exportAsync" in n && n.width > 0 && n.height > 0);
}

let describing = 0;
async function describe() {
  const run = ++describing;
  const all = exportable();
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
    frames.push({ id: node.id, name: node.name, width: Math.round(node.width), height: Math.round(node.height), thumb });
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

figma.ui.onmessage = async (msg) => {
  if (msg.type === "export") {
    try {
      const out = [];
      for (let i = 0; i < msg.ids.length; i++) {
        const node = await figma.getNodeByIdAsync(msg.ids[i]);
        if (!node || !("exportAsync" in node)) throw new Error("A selected frame was deleted. Select the frames again.");
        figma.ui.postMessage({ type: "progress", step: "export", done: i, total: msg.ids.length });
        const f = await exportFrame(node, msg.scale === 1 ? 1 : 2);
        out.push({ name: node.name, width: f.width, height: f.height, bytes: f.bytes });
      }
      figma.ui.postMessage({ type: "exported", frames: out });
    } catch (e) {
      figma.ui.postMessage({ type: "error", text: e instanceof Error ? e.message : String(e) });
    }
  } else if (msg.type === "open") {
    figma.openExternal(msg.url);
  } else if (msg.type === "notify") {
    figma.notify(msg.text);
  } else if (msg.type === "save-prefs") {
    await figma.clientStorage.setAsync("prefs", msg.prefs);
  } else if (msg.type === "ready") {
    const prefs = await figma.clientStorage.getAsync("prefs");
    figma.ui.postMessage({ type: "prefs", prefs: prefs || null });
    await describe();
  }
};

figma.on("selectionchange", () => void describe());
figma.on("currentpagechange", () => void describe());
