import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SceneDocumentSchema } from "@framekit/scene";
import { PREMIUM_TEMPLATES, sceneMotionSetup, premiumPreviewUrl } from "../premiumTemplates";
import { PREMIUM_USES } from "../templateSearch";
import { MOTION_PRESETS } from "../motion";
import { LIVE_BACKGROUNDS } from "../backgroundMotion";
import { zoomClipDuration } from "../cameraZoom";

const NEW_PRO = [
  "late-shift",
  "signal-poster",
  "glass-slab",
  "two-tone",
  "field-notes",
  "fanned",
  "zoom-tour",
  "turntable",
  "depth-story",
  "feature-tour",
];

const publicDir = join(__dirname, "..", "..", "public");

describe("premium templates", () => {
  it("has unique slugs", () => {
    const slugs = PREMIUM_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(PREMIUM_TEMPLATES.map((t) => [t.slug, t] as const))("%s builds a valid scene with a preview", (slug, t) => {
    const scene = t.build();
    const parsed = SceneDocumentSchema.safeParse(scene);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    expect(scene.canvas.width).toBe(t.width);
    expect(scene.canvas.height).toBe(t.height);
    expect(scene.template).toEqual({ id: slug, pro: !!t.pro });
    expect(existsSync(join(publicDir, premiumPreviewUrl(slug)))).toBe(true);
    expect(PREMIUM_USES[slug]?.length).toBeGreaterThan(0);
  });

  it("marks every new template as Pro", () => {
    for (const slug of NEW_PRO) {
      const t = PREMIUM_TEMPLATES.find((x) => x.slug === slug);
      expect(t, slug).toBeDefined();
      expect(t!.pro).toBe(true);
      expect(t!.build().template?.pro).toBe(true);
    }
  });

  it("keeps every layer inside a sane range of the canvas", () => {
    for (const t of PREMIUM_TEMPLATES.filter((x) => NEW_PRO.includes(x.slug))) {
      const scene = t.build();
      for (const l of scene.layers) {
        expect(Math.abs(l.transform.x), `${t.slug} ${l.id}`).toBeLessThan(t.width);
        expect(Math.abs(l.transform.y), `${t.slug} ${l.id}`).toBeLessThan(t.height);
      }
    }
  });
});

describe("video templates", () => {
  const video = PREMIUM_TEMPLATES.filter((t) => t.video);

  it("are the four motion and zoom templates", () => {
    expect(video.map((t) => t.slug).sort()).toEqual(["depth-story", "feature-tour", "turntable", "zoom-tour"]);
  });

  it.each(video.map((t) => [t.slug, t] as const))("%s carries its motion setup in the scene", (_slug, t) => {
    const scene = t.build();
    const setup = sceneMotionSetup(scene);
    expect(setup.live).toBe(t.video!.live);
    expect(LIVE_BACKGROUNDS.some((b) => b.id === setup.live)).toBe(true);
    if (t.video!.tab === "zoom") {
      const zooms = scene.timeline?.zooms ?? [];
      expect(zooms.length).toBeGreaterThan(1);
      for (const z of zooms) {
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.x).toBeLessThanOrEqual(1);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeLessThanOrEqual(1);
      }
      // shots don't overlap and the clip is long enough to play them all
      for (let i = 1; i < zooms.length; i++) expect(zooms[i].startMs).toBeGreaterThan(zooms[i - 1].startMs + zooms[i - 1].holdMs);
      expect(scene.timeline!.durationMs).toBe(zoomClipDuration(zooms));
      expect(new Set(zooms.map((z) => z.id)).size).toBe(zooms.length);
    } else {
      expect(setup.preset).toBeDefined();
      expect(MOTION_PRESETS.some((p) => p.id === setup.preset)).toBe(true);
    }
  });

  it("builds fresh zoom ids on every build", () => {
    const t = PREMIUM_TEMPLATES.find((x) => x.slug === "feature-tour")!;
    const a = t.build().timeline!.zooms!.map((z) => z.id);
    const b = t.build().timeline!.zooms!.map((z) => z.id);
    expect(a).not.toEqual(b);
  });

  it("still templates have no motion setup", () => {
    const still = PREMIUM_TEMPLATES.find((x) => x.slug === "two-tone")!.build();
    expect(sceneMotionSetup(still)).toEqual({});
  });
});
