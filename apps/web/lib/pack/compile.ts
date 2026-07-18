import { getDevice } from "@framekit/devices";
import {
  createId,
  createMockupLayer,
  createTextLayer,
  SceneDocumentSchema,
  type Background,
  type SceneDocument,
} from "@framekit/scene";
import {
  PACK_LAUNCH_SURFACE_IDS,
  PACK_LAUNCH_SURFACES,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  packLaunch,
  type LaunchSurfaceId,
  type PackDocument,
  type PackTargetId,
} from "./schema";
import { PACK_STYLES, type PackStyle } from "./styles";

/**
 * Pure pack → scene compiler. Every screen × store-target becomes an ordinary
 * SceneDocument rendered by the ONE renderer; nothing here touches the DOM.
 * Text/device placement uses fractions of the target canvas so one style
 * works across every store size.
 */

const LOCALE = "en";

export interface CompiledEntry {
  /** zip path, e.g. "App Store/6.9-inch-1320x2868/01.png" */
  path: string;
  scene: SceneDocument;
  panoramaIdx?: number;
  panoramaTotal?: number;
}

function packBackground(pack: PackDocument, style: PackStyle): Background {
  return pack.style.background ?? style.background(pack.style.accent);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function compilePackScene(pack: PackDocument, screenIndex: number, targetId: PackTargetId): SceneDocument {
  const target = PACK_TARGETS[targetId];
  const style = PACK_STYLES[pack.styleId];
  const screen = pack.screens[screenIndex];
  if (!screen) throw new Error(`pack has no screen ${screenIndex}`);
  const W = target.width;
  const H = target.height;
  const top = pack.style.captionPosition === "top";

  const scene: SceneDocument = {
    schemaVersion: 3,
    id: createId(),
    canvas: {
      width: W,
      height: H,
      background: packBackground(pack, style),
      ...(style.panorama ? { panoramaBackground: true } : {}),
    },
    layers: [],
  };

  const cap = screen.captions[LOCALE] ?? { title: "" };
  const titleSize = Math.round(W * 0.055 * (style.titleScale ?? 1));
  if (cap.title.trim()) {
    const title = createTextLayer(cap.title.trim());
    title.font = { family: pack.style.fontFamily, weight: 800, size: titleSize, lineHeight: 1.12, letterSpacing: -0.02 };
    title.color = style.captionColor;
    title.maxWidth = Math.round(W * 0.86);
    title.transform = { ...title.transform, y: Math.round((top ? -0.385 : 0.315) * H) };
    if (style.captionHighlight) {
      title.highlight = { color: style.captionHighlight, radius: Math.round(titleSize * 0.35), padX: Math.round(titleSize * 0.4), padY: Math.round(titleSize * 0.22) };
    }
    scene.layers.push(title);
  }
  if (cap.subtitle?.trim()) {
    const sub = createTextLayer(cap.subtitle.trim());
    sub.font = { family: pack.style.fontFamily, weight: 500, size: Math.round(W * 0.032), lineHeight: 1.3, letterSpacing: 0 };
    sub.color = style.subtitleColor;
    sub.maxWidth = Math.round(W * 0.8);
    sub.transform = { ...sub.transform, y: Math.round((top ? -0.315 : 0.385) * H) };
    scene.layers.push(sub);
  }

  if (!screen.overrides.hideDevice) {
    const device = getDevice(target.deviceId);
    if (!device) throw new Error(`unknown device ${target.deviceId}`);
    const layout = style.device(screenIndex, pack.screens.length);
    const layer = createMockupLayer({
      deviceId: device.id,
      media: screen.assetId
        ? { assetId: screen.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }
        : null,
    });
    layer.transform = {
      ...layer.transform,
      scale: round3((H * layout.heightFrac) / device.frame.height),
      x: Math.round(layout.xFrac * W),
      y: Math.round((top ? layout.yFrac : -layout.yFrac) * H),
      rotate: screen.overrides.flipTilt ? -layout.rotate : layout.rotate,
    };
    scene.layers.push(layer);
  }

  return SceneDocumentSchema.parse(scene);
}

/** 1024×500 Play Store banner: app name on the left, hero screen on the right. */
export function compileFeatureGraphic(pack: PackDocument): SceneDocument {
  const target = PACK_TARGETS["play-feature"];
  const style = PACK_STYLES[pack.styleId];
  const hero = pack.screens[0];
  const W = target.width;
  const H = target.height;

  const scene: SceneDocument = {
    schemaVersion: 3,
    id: createId(),
    canvas: { width: W, height: H, background: packBackground(pack, style) },
    layers: [],
  };

  const name = createTextLayer(pack.appName.trim() || "Your app");
  name.font = { family: pack.style.fontFamily, weight: 800, size: 58, lineHeight: 1.1, letterSpacing: -0.02 };
  name.color = style.captionColor;
  name.maxWidth = Math.round(W * 0.42);
  name.transform = { ...name.transform, x: Math.round(-0.24 * W) };
  scene.layers.push(name);

  const device = getDevice(target.deviceId);
  if (device && hero) {
    const layer = createMockupLayer({
      deviceId: device.id,
      media: hero.assetId
        ? { assetId: hero.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }
        : null,
    });
    layer.transform = {
      ...layer.transform,
      scale: round3((H * 1.6) / device.frame.height),
      x: Math.round(0.26 * W),
      y: Math.round(0.42 * H),
      rotate: -8,
    };
    scene.layers.push(layer);
  }

  return SceneDocumentSchema.parse(scene);
}

/**
 * One launch-kit promo surface (Product Hunt / OG / X / Story): app name +
 * tagline over the hero screen, in the surface's exact canvas dims. Mirrors
 * `compileFeatureGraphic`'s left-text/right-device layout for landscape
 * surfaces; the portrait story gets a stacked top-third headline layout.
 */
export function compileLaunchScene(pack: PackDocument, surfaceId: LaunchSurfaceId): SceneDocument {
  const surface = PACK_LAUNCH_SURFACES[surfaceId];
  const style = PACK_STYLES[pack.styleId];
  const hero = pack.screens[0];
  const tagline = packLaunch(pack).tagline.trim();
  const portrait = surface.orientation === "portrait";
  const W = surface.width;
  const H = surface.height;

  const scene: SceneDocument = {
    schemaVersion: 3,
    id: createId(),
    canvas: { width: W, height: H, background: packBackground(pack, style) },
    layers: [],
  };

  const headlineSize = Math.round(portrait ? W * 0.07 : Math.min(W, H) * 0.06);
  const taglineSize = Math.round(headlineSize * 0.55);

  const headline = createTextLayer(pack.appName.trim() || "Your app");
  headline.font = { family: pack.style.fontFamily, weight: 800, size: headlineSize, lineHeight: 1.1, letterSpacing: -0.02 };
  headline.color = style.captionColor;
  if (portrait) {
    headline.maxWidth = Math.round(W * 0.86);
    headline.transform = { ...headline.transform, y: Math.round(-0.32 * H) };
  } else {
    headline.maxWidth = Math.round(W * 0.42);
    headline.transform = {
      ...headline.transform,
      x: Math.round(-0.24 * W),
      y: tagline ? -Math.round(headlineSize * 0.6) : 0,
    };
  }
  scene.layers.push(headline);

  if (tagline) {
    const sub = createTextLayer(tagline);
    sub.font = { family: pack.style.fontFamily, weight: 500, size: taglineSize, lineHeight: 1.3, letterSpacing: 0 };
    sub.color = style.subtitleColor;
    if (portrait) {
      sub.maxWidth = Math.round(W * 0.8);
      sub.transform = { ...sub.transform, y: Math.round(-0.32 * H + headlineSize * 1.15) };
    } else {
      sub.maxWidth = Math.round(W * 0.42);
      sub.transform = { ...sub.transform, x: Math.round(-0.24 * W), y: Math.round(headlineSize * 0.55) };
    }
    scene.layers.push(sub);
  }

  const device = getDevice(surface.deviceId);
  if (device && hero) {
    const layer = createMockupLayer({
      deviceId: device.id,
      media: hero.assetId
        ? { assetId: hero.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }
        : null,
    });
    layer.transform = {
      ...layer.transform,
      scale: round3((H * (portrait ? 0.62 : 1.6)) / device.frame.height),
      x: portrait ? 0 : Math.round(0.26 * W),
      y: portrait ? Math.round(0.18 * H) : Math.round(0.42 * H),
      rotate: portrait ? 0 : -8,
    };
    scene.layers.push(layer);
  }

  return SceneDocumentSchema.parse(scene);
}

/** Every screen × enabled portrait target (screens numbered 01..NN), then the feature graphic. */
export function compilePack(pack: PackDocument): CompiledEntry[] {
  const style = PACK_STYLES[pack.styleId];
  const entries: CompiledEntry[] = [];
  for (const targetId of PACK_TARGET_IDS) {
    if (targetId === "play-feature" || !pack.targets[targetId]) continue;
    const folder = PACK_TARGETS[targetId].folder;
    pack.screens.forEach((_, i) => {
      entries.push({
        path: `${folder}/${String(i + 1).padStart(2, "0")}.png`,
        scene: compilePackScene(pack, i, targetId),
        ...(style.panorama ? { panoramaIdx: i, panoramaTotal: pack.screens.length } : {}),
      });
    });
  }
  if (pack.targets["play-feature"]) {
    entries.push({ path: "Play Store/feature-graphic-1024x500.png", scene: compileFeatureGraphic(pack) });
  }
  const launch = pack.launch;
  if (launch) {
    for (const id of PACK_LAUNCH_SURFACE_IDS) {
      if (!launch.surfaces[id]) continue;
      entries.push({ path: PACK_LAUNCH_SURFACES[id].file, scene: compileLaunchScene(pack, id) });
    }
  }
  return entries;
}

const LAUNCH_SURFACE_DESCRIPTIONS: Record<LaunchSurfaceId, string> = {
  "product-hunt": "Product Hunt gallery image.",
  "og-image": "og:image / Twitter card meta tag.",
  "x-post": "X / LinkedIn launch post.",
  "story": "Instagram / TikTok story.",
};

export function packReadme(pack: PackDocument, failed: string[] = []): string {
  const lines: string[] = [
    `${pack.appName.trim() || "Your app"} — store screenshot pack`,
    "Generated with MockFrame · https://mockframe.app/app-store-screenshots",
    "",
    "WHERE TO UPLOAD",
    "----------------",
  ];
  if (pack.targets["appstore-69"])
    lines.push('App Store/6.9-inch-1320x2868/  → App Store Connect → your app → Screenshots → "iPhone 6.9″ Display".');
  if (pack.targets["appstore-65"])
    lines.push('App Store/6.5-inch-1284x2778/  → App Store Connect → Screenshots → "iPhone 6.5″ Display".');
  if (pack.targets["appstore-ipad13"])
    lines.push('App Store/iPad-13-inch-2064x2752/  → App Store Connect → Screenshots → "iPad 13″ Display".');
  if (pack.targets["play-phone"])
    lines.push("Play Store/phone-1080x1920/  → Play Console → Store presence → Main store listing → Phone screenshots.");
  if (pack.targets["play-feature"])
    lines.push("Play Store/feature-graphic-1024x500.png  → Play Console → Main store listing → Feature graphic.");
  lines.push("", "Files are numbered in the order they appear in the store gallery.");
  const launch = pack.launch;
  const enabledLaunchIds = launch ? PACK_LAUNCH_SURFACE_IDS.filter((id) => launch.surfaces[id]) : [];
  if (enabledLaunchIds.length) {
    lines.push("", "LAUNCH KIT", "----------------");
    for (const id of enabledLaunchIds) {
      lines.push(`${PACK_LAUNCH_SURFACES[id].file}  → ${LAUNCH_SURFACE_DESCRIPTIONS[id]}`);
    }
  }
  if (failed.length) {
    lines.push("", "FAILED TO RENDER", "----------------");
    for (const f of failed) lines.push(f);
    lines.push("Re-run the export from MockFrame to retry these files.");
  }
  return lines.join("\n");
}
