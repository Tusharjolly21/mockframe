import { describe, expect, it } from "vitest";
import { renderAiApp } from "../aiapp";
import type { AiAppDoc } from "../types";

const ARCHETYPES: AiAppDoc["archetype"][] = [
  "onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat",
];

function doc(archetype: AiAppDoc["archetype"], overrides: Partial<AiAppDoc> = {}): AiAppDoc {
  return {
    app: "aiapp",
    chrome: { time: "9:41", battery: 100 },
    archetype,
    appName: "Focusly",
    palette: { primary: "#6d28d9", bg: "#f6f5fb", card: "#ffffff", text: "#17171c", muted: "#6f6f7a" },
    header: { title: "Plan your day", subtitle: "Smart daily planning" },
    items: [
      { title: "Morning routine", subtitle: "6 tasks", value: "80%", emoji: "🌅" },
      { title: "Deep work", subtitle: "2h focus block", value: "45m" },
      { title: "Review", subtitle: "Weekly retro" },
    ],
    stats: [{ label: "Streak", value: "12d" }, { label: "Done", value: "94%" }],
    cta: "Get started",
    tabs: ["Home", "Plan", "Stats", "Me"],
    ...overrides,
  };
}

describe("renderAiApp", () => {
  it("renders every archetype without NaN/undefined and with the app content", () => {
    for (const a of ARCHETYPES) {
      const svg = renderAiApp(doc(a));
      expect(svg, a).not.toContain("NaN");
      expect(svg, a).not.toContain("undefined");
      expect(svg.length, a).toBeGreaterThan(500);
    }
  });

  it("escapes XML-hostile content", () => {
    const svg = renderAiApp(doc("list", { header: { title: 'A<b>&"quote"' }, items: [{ title: "<script>" }] }));
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain('A<b>');
  });

  it("tolerates empty optional fields", () => {
    const svg = renderAiApp(doc("dashboard", { items: [], stats: undefined, tabs: undefined, cta: undefined, header: { title: "T" } }));
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
  });

  it("dark mode uses the dark background", () => {
    const svg = renderAiApp(doc("home-feed", { dark: true, chrome: { time: "9:41", battery: 100, dark: true }, palette: { primary: "#8b5cf6", bg: "#0e0e12", card: "#1a1a21", text: "#f4f4f8", muted: "#9a9aa6" } }));
    expect(svg).toContain("#0e0e12");
  });

  it("sanitizes malicious palette colors preventing SVG attribute injection", () => {
    const svg = renderAiApp(doc("list", { palette: { primary: '"><script>alert(1)</script>', bg: "#ffffff", card: "#ffffff", text: "#000000", muted: "#808080" } }));
    expect(svg).not.toContain('"><script>');
    expect(svg).not.toContain('alert(1)');
    expect(svg).toContain("#888888"); // fallback color for invalid palette
  });
});
