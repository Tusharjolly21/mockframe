import { describe, expect, it } from "vitest";
import { TranslateBodySchema, repairTranslations, translateUserPrompt } from "../../ai/translate";
import { captionFit, compilePack, compilePackScene, packReadme, screenCaption } from "../compile";
import { STORE_LOCALES } from "../locales";
import { addLocales, applyTranslation, missingTranslations, removeLocale, setCaption } from "../ops";
import { createPack, createPackScreen, PackDocumentSchema, type PackDocument } from "../schema";

function pack(): PackDocument {
  const p = createPack();
  p.appName = "Habitat";
  p.screens = [createPackScreen("a1"), createPackScreen("a2")];
  p.screens[0].captions.en = { title: "Build habits that stick", subtitle: "Tiny steps, every day" };
  p.screens[1].captions.en = { title: "See your streaks" };
  p.targets = { "appstore-69": true, "appstore-65": false, "appstore-ipad13": false, "play-phone": false, "play-feature": true };
  return p;
}

const titleOf = (scene: ReturnType<typeof compilePackScene>) =>
  scene.layers.find((l) => l.type === "text") as { content: string; font: { size: number } } | undefined;

describe("pack languages", () => {
  it("has unique locale ids and play codes", () => {
    expect(new Set(STORE_LOCALES.map((l) => l.id)).size).toBe(STORE_LOCALES.length);
    expect(new Set(STORE_LOCALES.map((l) => l.play)).size).toBe(STORE_LOCALES.length);
  });

  it("adds known languages once, ignores unknown ones, and removes their captions", () => {
    let p = addLocales(pack(), ["de-DE", "de-DE", "xx-XX", "en", "ja"]);
    expect(p.locales).toEqual(["de-DE", "ja"]);
    p = applyTranslation(p, "de-DE", [{ title: "Gewohnheiten, die bleiben", subtitle: "Kleine Schritte" }, { title: "Deine Serien" }]);
    expect(p.screens[0].captions["de-DE"]).toEqual({ title: "Gewohnheiten, die bleiben", subtitle: "Kleine Schritte" });
    p = removeLocale(p, "de-DE");
    expect(p.locales).toEqual(["ja"]);
    expect(p.screens[0].captions["de-DE"]).toBeUndefined();
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });

  it("drops a subtitle the source doesn't have and counts missing screens", () => {
    let p = addLocales(pack(), ["fr-FR"]);
    expect(missingTranslations(p, "fr-FR")).toBe(2);
    p = applyTranslation(p, "fr-FR", [{ title: "Des habitudes qui durent" }, { title: "Vos séries", subtitle: "extra" }]);
    expect(p.screens[1].captions["fr-FR"]).toEqual({ title: "Vos séries" });
    expect(missingTranslations(p, "fr-FR")).toBe(0);
    p = setCaption(p, p.screens[1].id, "Tes séries", "", "fr-FR");
    expect(p.screens[1].captions["fr-FR"].title).toBe("Tes séries");
    expect(p.screens[1].captions.en.title).toBe("See your streaks");
  });

  it("falls back to the source caption for untranslated screens", () => {
    const p = applyTranslation(addLocales(pack(), ["ja"]), "ja", [{ title: "続く習慣を" }]);
    expect(screenCaption(p.screens[0], "ja").title).toBe("続く習慣を");
    expect(screenCaption(p.screens[1], "ja").title).toBe("See your streaks");
    expect(titleOf(compilePackScene(p, 1, "appstore-69", "ja"))?.content).toBe("See your streaks");
  });

  it("shrinks long captions, counting CJK as wide", () => {
    expect(captionFit("Short one", 30)).toBe(1);
    expect(captionFit("Verfolge jede Gewohnheit an jedem einzelnen Tag", 30)).toBeLessThan(1);
    expect(captionFit("毎日の習慣を記録して続けよう毎日の習慣", 30)).toBeLessThan(1);
    expect(captionFit("x".repeat(500), 30)).toBe(0.68);
    const p = applyTranslation(addLocales(pack(), ["de-DE"]), "de-DE", [{ title: "Verfolge jede Gewohnheit an jedem einzelnen Tag" }]);
    const en = titleOf(compilePackScene(p, 0, "appstore-69"))!;
    const de = titleOf(compilePackScene(p, 0, "appstore-69", "de-DE"))!;
    expect(de.font.size).toBeLessThan(en.font.size);
  });

  it("keeps the flat zip layout without languages and adds a folder per language with them", () => {
    const flat = compilePack(pack()).map((e) => e.path);
    expect(flat).toContain("App Store/6.9-inch-1320x2868/01.png");
    const localized = compilePack(addLocales(pack(), ["de-DE", "ja"])).map((e) => e.path);
    expect(localized).toContain("source/App Store/6.9-inch-1320x2868/01.png");
    expect(localized).toContain("de-DE/App Store/6.9-inch-1320x2868/02.png");
    expect(localized).toContain("ja/App Store/6.9-inch-1320x2868/01.png");
    expect(localized.filter((p) => p.includes("feature-graphic"))).toHaveLength(1);
    expect(packReadme(addLocales(pack(), ["de-DE"]))).toContain("de-DE/");
  });
});

describe("translation request", () => {
  const body = TranslateBodySchema.parse({
    appName: "Habitat",
    captions: [{ title: "Build habits that stick", subtitle: "Tiny steps" }, { title: "See your streaks" }],
    locales: ["de-DE", "ar-SA"],
  });

  it("rejects unknown locales and oversized batches", () => {
    expect(TranslateBodySchema.safeParse({ captions: [{ title: "x" }], locales: ["xx"] }).success).toBe(false);
    expect(TranslateBodySchema.safeParse({ captions: [{ title: "x" }], locales: STORE_LOCALES.slice(0, 7).map((l) => l.id) }).success).toBe(false);
  });

  it("names every locale in the prompt and flags right-to-left scripts", () => {
    const prompt = translateUserPrompt(body);
    expect(prompt).toContain("- de-DE: German");
    expect(prompt).toContain("- ar-SA: Arabic (right-to-left script)");
  });

  it("repairs missing locales, missing captions and blank titles from the source", () => {
    const out = repairTranslations(
      { translations: [{ locale: "de-DE", captions: [{ title: "  Gewohnheiten, die bleiben " }] }, { locale: "fr-FR", captions: [] }] },
      body
    );
    expect(Object.keys(out)).toEqual(["de-DE", "ar-SA"]);
    expect(out["de-DE"][0]).toEqual({ title: "Gewohnheiten, die bleiben", subtitle: "Tiny steps" });
    expect(out["de-DE"][1]).toEqual({ title: "See your streaks" });
    expect(out["ar-SA"]).toHaveLength(2);
  });
});

describe("fastlane layout", () => {
  it("writes deliver and supply folders per language", async () => {
    const { setSourceLocale } = await import("../ops");
    let p = addLocales(pack(), ["de-DE", "ja"]);
    p = { ...p, exportLayout: "fastlane", targets: { ...p.targets, "play-phone": true } };
    const paths = compilePack(p).map((e) => e.path);
    expect(paths).toContain("fastlane/screenshots/en-US/01_iPhone69.png");
    expect(paths).toContain("fastlane/screenshots/de-DE/02_iPhone69.png");
    expect(paths).toContain("fastlane/metadata/android/ja-JP/images/phoneScreenshots/01.png");
    expect(paths).toContain("fastlane/metadata/android/en-US/images/featureGraphic.png");
    expect(packReadme(p)).toContain("fastlane deliver");
    expect(packReadme(p)).toContain("en-US, de-DE, ja");

    // a German-first app: source folders are de-DE, and German can't also be a target
    p = setSourceLocale(p, "de-DE");
    expect(p.locales).toEqual(["ja"]);
    expect(addLocales(p, ["de-DE"]).locales).toEqual(["ja"]);
    const de = compilePack(p).map((e) => e.path);
    expect(de).toContain("fastlane/screenshots/de-DE/01_iPhone69.png");
    expect(de.some((x) => x.includes("/en-US/"))).toBe(false);
  });
});
