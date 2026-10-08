/**
 * Keyboard shortcuts for the screen recorder, in one place so the handlers,
 * the floating controls and the shortcuts sheet agree.
 */

export type RecorderAction =
  | "record"
  | "pause"
  | "cancel"
  | "play"
  | "back"
  | "forward"
  | "backLong"
  | "forwardLong"
  | "start"
  | "end"
  | "addZoom"
  | "addClick"
  | "follow"
  | "delete"
  | "undo"
  | "redo"
  | "export"
  | "help";

/** Recording shortcuts use Alt/Option + Shift so they don't clash with whatever you're recording. */
export function matchRecordingKey(e: KeyboardEvent): RecorderAction | null {
  if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey) {
    // e.code: Option changes e.key on a Mac (⌥⇧R types ‰)
    if (e.code === "KeyR") return "record";
    if (e.code === "KeyP") return "pause";
  }
  if (e.key === "Escape") return "cancel";
  return null;
}

export function matchEditorKey(e: KeyboardEvent): RecorderAction | null {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && !e.altKey) {
    if (e.code === "KeyZ") return e.shiftKey ? "redo" : "undo";
    if (e.code === "KeyY") return "redo";
    if (e.code === "KeyE") return "export";
    return null;
  }
  if (e.altKey) return null;
  switch (e.key) {
    case " ":
      return "play";
    case "ArrowLeft":
      return e.shiftKey ? "backLong" : "back";
    case "ArrowRight":
      return e.shiftKey ? "forwardLong" : "forward";
    case "Home":
      return "start";
    case "End":
      return "end";
    case "Delete":
    case "Backspace":
      return "delete";
    case "?":
      return "help";
  }
  switch (e.code) {
    case "KeyZ":
      return "addZoom";
    case "KeyC":
      return "addClick";
    case "KeyF":
      return "follow";
  }
  return null;
}

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Keys as shown to people, per platform. */
export function keyLabel(keys: string[]): string[] {
  const mac = isMac();
  return keys.map((k) => {
    if (k === "Alt") return mac ? "⌥" : "Alt";
    if (k === "Shift") return mac ? "⇧" : "Shift";
    if (k === "Mod") return mac ? "⌘" : "Ctrl";
    return k;
  });
}

export const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Recording",
    items: [
      { keys: ["Alt", "Shift", "R"], label: "Start or stop recording" },
      { keys: ["Alt", "Shift", "P"], label: "Pause or resume" },
      { keys: ["Esc"], label: "Cancel the countdown" },
    ],
  },
  {
    group: "Playback",
    items: [
      { keys: ["Space"], label: "Play or pause" },
      { keys: ["←", "→"], label: "Back or forward 1 second" },
      { keys: ["Shift", "←"], label: "Back or forward 5 seconds" },
      { keys: ["Home"], label: "Go to the start" },
    ],
  },
  {
    group: "Editing",
    items: [
      { keys: ["Z"], label: "Add a zoom at the playhead" },
      { keys: ["C"], label: "Add a click at the playhead" },
      { keys: ["F"], label: "Follow the cursor in the selected zoom" },
      { keys: ["Delete"], label: "Delete the selected zoom or click" },
      { keys: ["Mod", "Z"], label: "Undo" },
      { keys: ["Mod", "Shift", "Z"], label: "Redo" },
      { keys: ["Mod", "E"], label: "Export" },
      { keys: ["?"], label: "Show shortcuts" },
    ],
  },
];
