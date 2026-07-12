"use client";

import { esc } from "./common";
import { codeFontFor } from "./fonts";
import { renderFramed, type FramedResult } from "./frames";
import type { CodeDoc } from "./types";

/**
 * Code template card: a lightweight multi-language syntax highlighter + a
 * selectable syntax theme + monospace code font, wrapped in any of the shared
 * window frames (none / macOS / Safari / Card / Stack / Stack 2 / Arc / Windows).
 */

const PAD_X = 18;
const PAD_TOP = 15;
const PAD_BOT = 17;

export type CodeThemeDef = {
  bg: string;
  bar: string;
  barText: string;
  text: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  func: string;
  punct: string;
  variable: string;
  gutter: string;
  dark: boolean;
};

/** Popular editor syntax themes (the ones PostSpark ships). */
export const CODE_THEMES: Record<string, CodeThemeDef> = {
  "github-dark": { bg: "#0d1117", bar: "#161b22", barText: "#7d8590", text: "#e6edf3", comment: "#8b949e", keyword: "#ff7b72", string: "#a5d6ff", number: "#79c0ff", func: "#d2a8ff", punct: "#c9d1d9", variable: "#ffa657", gutter: "#6e7681", dark: true },
  "github-light": { bg: "#ffffff", bar: "#f6f8fa", barText: "#59636e", text: "#1f2328", comment: "#6e7781", keyword: "#cf222e", string: "#0a3069", number: "#0550ae", func: "#8250df", punct: "#24292f", variable: "#953800", gutter: "#8c959f", dark: false },
  "night-owl": { bg: "#011627", bar: "#0b2942", barText: "#5f7e97", text: "#d6deeb", comment: "#637777", keyword: "#c792ea", string: "#ecc48d", number: "#f78c6c", func: "#82aaff", punct: "#7fdbca", variable: "#addb67", gutter: "#4b6479", dark: true },
  "one-dark": { bg: "#282c34", bar: "#21252b", barText: "#828997", text: "#abb2bf", comment: "#5c6370", keyword: "#c678dd", string: "#98c379", number: "#d19a66", func: "#61afef", punct: "#56b6c2", variable: "#e06c75", gutter: "#4b5263", dark: true },
  "one-light": { bg: "#fafafa", bar: "#eaeaeb", barText: "#8a8b91", text: "#383a42", comment: "#a0a1a7", keyword: "#a626a4", string: "#50a14f", number: "#986801", func: "#4078f2", punct: "#0184bc", variable: "#e45649", gutter: "#9d9d9f", dark: false },
  dracula: { bg: "#282a36", bar: "#21222c", barText: "#8189ad", text: "#f8f8f2", comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", func: "#50fa7b", punct: "#ff79c6", variable: "#ffb86c", gutter: "#6272a4", dark: true },
  vesper: { bg: "#101010", bar: "#161616", barText: "#8b8b8b", text: "#ffffff", comment: "#8b8b8b", keyword: "#a0a0a0", string: "#99ffe4", number: "#ffc799", func: "#ffc799", punct: "#a0a0a0", variable: "#ff8080", gutter: "#505050", dark: true },
  "ayu-dark": { bg: "#0b0e14", bar: "#0d1017", barText: "#565b66", text: "#bfbdb6", comment: "#565b66", keyword: "#ff8f40", string: "#aad94c", number: "#d2a6ff", func: "#ffb454", punct: "#f29668", variable: "#59c2ff", gutter: "#3d4149", dark: true },
  monokai: { bg: "#272822", bar: "#1e1f1c", barText: "#8f908a", text: "#f8f8f2", comment: "#75715e", keyword: "#f92672", string: "#e6db74", number: "#ae81ff", func: "#a6e22e", punct: "#f92672", variable: "#fd971f", gutter: "#75715e", dark: true },
};

export const CODE_THEME_LABELS: Record<string, string> = {
  "github-dark": "GitHub Dark",
  "github-light": "GitHub Light",
  "night-owl": "Night Owl",
  "one-dark": "One Dark",
  "one-light": "One Light",
  dracula: "Dracula",
  vesper: "Vesper",
  "ayu-dark": "Ayu Dark",
  monokai: "Monokai",
};

/* ------------------------------- tokenizer ---------------------------------- */

const KEYWORDS = new Set([
  "const", "let", "var", "function", "fn", "func", "def", "return", "if", "else", "elif", "for", "while", "do",
  "switch", "case", "break", "continue", "default", "class", "struct", "enum", "interface", "type", "extends",
  "implements", "new", "delete", "this", "self", "super", "import", "export", "from", "as", "async", "await",
  "try", "catch", "finally", "throw", "throws", "typeof", "instanceof", "in", "of", "void", "yield", "static",
  "public", "private", "protected", "final", "abstract", "namespace", "using", "package", "module", "lambda",
  "match", "impl", "trait", "pub", "mut", "use", "require", "include", "print", "echo", "go", "defer", "select",
  "int", "float", "double", "char", "bool", "boolean", "string", "long", "short", "byte", "unsigned", "auto",
  "true", "false", "null", "nil", "None", "True", "False", "undefined", "not", "and", "or", "is", "with", "pass",
  "when", "val", "fun", "override", "suspend", "guard", "extension",
]);

type Span = { text: string; color: string };

function tokenizeLine(line: string, th: CodeThemeDef): Span[] {
  const out: Span[] = [];
  const n = line.length;
  let i = 0;
  const isWord = (c: string) => /[A-Za-z0-9_$]/.test(c);
  while (i < n) {
    const c = line[i];
    if (c === " " || c === "\t") {
      let j = i;
      while (j < n && (line[j] === " " || line[j] === "\t")) j++;
      out.push({ text: line.slice(i, j), color: th.text });
      i = j;
      continue;
    }
    if ((c === "/" && line[i + 1] === "/") || c === "#" || (c === "-" && line[i + 1] === "-")) {
      out.push({ text: line.slice(i), color: th.comment });
      break;
    }
    if (c === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      const j = end === -1 ? n : end + 2;
      out.push({ text: line.slice(i, j), color: th.comment });
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && line[j] !== c) {
        if (line[j] === "\\") j++;
        j++;
      }
      j = Math.min(n, j + 1);
      out.push({ text: line.slice(i, j), color: th.string });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1] ?? ""))) {
      let j = i;
      while (j < n && /[0-9a-fA-Fxob._]/.test(line[j])) j++;
      out.push({ text: line.slice(i, j), color: th.number });
      i = j;
      continue;
    }
    if (/[A-Za-z_$@]/.test(c)) {
      let j = i;
      while (j < n && isWord(line[j])) j++;
      const word = line.slice(i, j);
      let k = j;
      while (k < n && line[k] === " ") k++;
      const isCall = line[k] === "(";
      const color = KEYWORDS.has(word) ? th.keyword : isCall ? th.func : /^[A-Z]/.test(word) ? th.variable : th.text;
      out.push({ text: word, color });
      i = j;
      continue;
    }
    {
      let j = i;
      while (
        j < n && !isWord(line[j]) && line[j] !== " " && line[j] !== "\t" &&
        line[j] !== '"' && line[j] !== "'" && line[j] !== "`" &&
        !(line[j] === "/" && (line[j + 1] === "/" || line[j + 1] === "*")) && line[j] !== "#"
      )
        j++;
      if (j === i) j++;
      out.push({ text: line.slice(i, j), color: th.punct });
      i = j;
    }
  }
  return out;
}

const MAX_LINES = 44;

function codeLines(doc: CodeDoc): string[] {
  return (doc.code ?? "").replace(/\t/g, "  ").split("\n").slice(0, MAX_LINES);
}

/** Render the Code template card. Returns the inner SVG + its total height. */
export function renderCode(doc: CodeDoc): FramedResult {
  const th = CODE_THEMES[doc.theme] ?? CODE_THEMES["github-dark"];
  const font = codeFontFor(doc.codeFont);
  const fs = doc.fontSize ?? 13;
  const lineH = Math.round(fs * 1.65);
  const lines = codeLines(doc);
  const digits = String(Math.max(1, lines.length)).length;
  const gutterW = doc.lineNumbers ? Math.round(fs * 0.62 * digits) + 16 : 0;

  const draw = (x: number, y: number) => {
    const parts: string[] = [];
    const codeX = x + PAD_X + gutterW;
    lines.forEach((line, idx) => {
      const baseY = y + PAD_TOP + idx * lineH + fs * 0.82;
      if (doc.lineNumbers) {
        parts.push(`<text font-family="${font}" font-size="${fs}" fill="${th.gutter}" text-anchor="end" x="${x + PAD_X + gutterW - 12}" y="${baseY.toFixed(1)}">${idx + 1}</text>`);
      }
      const spans = tokenizeLine(line, th).map((s) => `<tspan fill="${s.color}">${esc(s.text)}</tspan>`).join("");
      parts.push(`<text xml:space="preserve" font-family="${font}" font-size="${fs}" x="${codeX}" y="${baseY.toFixed(1)}">${spans || " "}</text>`);
    });
    return { svg: parts.join("\n"), height: PAD_TOP + Math.max(1, lines.length) * lineH + PAD_BOT };
  };

  return renderFramed(doc.frame, { cardBg: th.bg, barBg: th.bar, barText: th.barText, dark: th.dark, title: doc.filename }, draw);
}
