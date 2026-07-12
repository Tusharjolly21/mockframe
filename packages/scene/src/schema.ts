import { z } from "zod";

export const SCHEMA_VERSION = 3 as const;

/* ---------------------------------- shared ---------------------------------- */

export const GradientStopSchema = z.object({
  at: z.number().min(0).max(1),
  color: z.string(),
});

export const TransformSchema = z.object({
  x: z.number(), // px offset of layer center from canvas center, logical canvas coords
  y: z.number(),
  scale: z.number().positive(),
  rotate: z.number(), // degrees
  tiltX: z.number().min(-60).max(60), // degrees, CSS rotateX
  tiltY: z.number().min(-60).max(60),
  perspective: z.number().positive(), // px
});

/* -------------------------------- background -------------------------------- */

export const BackgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: z.string() }),
  z.object({
    type: z.literal("linear-gradient"),
    angle: z.number(),
    stops: z.array(GradientStopSchema).min(2),
  }),
  z.object({
    type: z.literal("radial-gradient"),
    cx: z.number().min(0).max(1),
    cy: z.number().min(0).max(1),
    stops: z.array(GradientStopSchema).min(2),
  }),
  z.object({
    type: z.literal("mesh-gradient"),
    seed: z.number().int(), // deterministic from seed — critical for re-render parity
    colors: z.array(z.string()).min(2).max(8),
  }),
  z.object({
    type: z.literal("image"),
    assetId: z.string(),
    fit: z.enum(["cover", "contain"]),
    blur: z.number().min(0).max(100),
    opacity: z.number().min(0).max(1),
  }),
  z.object({ type: z.literal("transparent") }),
]);

/* ---------------------------------- effects ---------------------------------- */

export const EffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noise"), intensity: z.number().min(0).max(1), monochrome: z.boolean() }),
  z.object({ type: z.literal("grain"), intensity: z.number().min(0).max(1), seed: z.number().int() }),
  z.object({ type: z.literal("vhs"), intensity: z.number().min(0).max(1) }),
  z.object({ type: z.literal("glitch"), intensity: z.number().min(0).max(1), seed: z.number().int() }),
  z.object({ type: z.literal("vignette"), intensity: z.number().min(0).max(1), color: z.string() }),
  z.object({ type: z.literal("blur"), radius: z.number().min(0).max(100) }),
]);

/* --------------------------------- backdrop ---------------------------------- */
/* Scene-wide decorative backdrop layers (PostSpark parity) — apply to ANY
   scene regardless of the media inside: a repeating Pattern behind the subject,
   a cast light/shadow Overlay on top, and a Portrait depth treatment. */

export const BackdropSchema = z.object({
  pattern: z
    .object({
      kind: z.enum(["circles", "waves", "dots", "rays", "grid", "stripes", "noise"]),
      intensity: z.number().min(0).max(1),
      thickness: z.number().min(0).max(1),
      color: z.string(),
    })
    .optional(),
  overlay: z
    .object({
      kind: z.enum(["blinds", "window", "diagonal", "spotlight", "top-light", "leaves", "branch", "palm", "window-grid"]),
      intensity: z.number().min(0).max(1),
    })
    .optional(),
  /** backdrop-only CSS filters (never touch the devices) */
  filter: z
    .object({
      blur: z.number().min(0).max(40),
      saturation: z.number().min(0).max(3),
      opacity: z.number().min(0).max(1),
    })
    .optional(),
  portrait: z
    .object({
      mode: z.enum(["blur", "stage"]),
      position: z.number().min(0).max(100), // horizontal focal point %
      distance: z.number().min(0).max(100), // blur strength / stage spread
    })
    .optional(),
});

/* ---------------------------------- shadow ----------------------------------- */

// Shadow is a LIGHTING model, not raw offsets: offset is derived from lightAngle × distance.
export const ShadowSchema = z.object({
  mode: z.enum(["spread", "hug", "adaptive"]),
  lightAngle: z.number(), // degrees; 90 = light from above
  distance: z.number().min(0),
  softness: z.number().min(0),
  opacity: z.number().min(0).max(1),
  color: z.string(),
});

/* ---------------------------------- layers ----------------------------------- */

export const MediaSchema = z.object({
  assetId: z.string(),
  kind: z.enum(["image", "video"]),
  /** cover = crop to fill · contain = letterbox · fill = stretch */
  fit: z.enum(["cover", "contain", "fill"]),
  offsetX: z.number(),
  offsetY: z.number(),
  scale: z.number().positive(),
  /** letterbox color behind contain-fit media */
  bg: z.string().optional(),
  trim: z.object({ startMs: z.number(), endMs: z.number() }).optional(),
});

export const MockupLayerSchema = z.object({
  type: z.literal("mockup"),
  id: z.string(),
  deviceId: z.string().nullable(), // null = frameless screenshot
  frameVariant: z.string().optional(),
  screenshotStyle: z
    .enum(["default", "glass-light", "glass-dark", "liquid-glass", "inset-light", "inset-dark", "outline", "border"])
    .optional(), // frameless only
  media: MediaSchema.nullable(),
  /**
   * Present only when this layer is a Realistic-render (Pro) composite from the
   * Mockuuups API. That render is a FLAT baked photo, so `media.assetId` is the
   * composite — but we keep the user's ORIGINAL screenshot (`sourceAssetId`) and
   * the render params here. "Edit screenshot" then edits that source and
   * re-renders it onto the device, instead of letting the user crop the whole
   * composite scene.
   */
  render: z
    .object({
      sourceAssetId: z.string(),
      mockupId: z.string(),
      hd: z.boolean().optional(),
    })
    .optional(),
  transform: TransformSchema,
  shadow: ShadowSchema.nullable(),
  cornerRadius: z.number().min(0).optional(), // frameless only
  border: z
    .object({
      width: z.number().min(0),
      color: z.union([z.string(), z.array(GradientStopSchema)]),
      inset: z.number().min(0),
    })
    .optional(),
  effects: z.array(EffectSchema).optional(),
});

export const TextLayerSchema = z.object({
  type: z.literal("text"),
  id: z.string(),
  content: z.string(),
  font: z.object({
    family: z.string(),
    weight: z.number(),
    size: z.number().positive(),
    lineHeight: z.number().positive(),
    letterSpacing: z.number(),
  }),
  color: z.string(),
  align: z.enum(["left", "center", "right"]),
  maxWidth: z.number().positive().nullable(),
  transform: TransformSchema,
  effects: z.array(EffectSchema).optional(),
  /* --- premium type styling (all optional) --- */
  italic: z.boolean().optional(),
  uppercase: z.boolean().optional(),
  /** gradient text fill (overrides color when set) */
  gradient: z.array(GradientStopSchema).optional(),
  /** outline / stroke */
  stroke: z.object({ width: z.number().min(0), color: z.string() }).optional(),
  /** drop shadow */
  shadow: z.object({ x: z.number(), y: z.number(), blur: z.number().min(0), color: z.string() }).optional(),
  /** highlight pill behind the text */
  highlight: z.object({ color: z.string(), radius: z.number().min(0), padX: z.number().min(0), padY: z.number().min(0) }).optional(),
});

export const StickerLayerSchema = z.union([
  z.object({
    type: z.literal("sticker"),
    id: z.string(),
    stickerId: z.string(),
    tint: z.string().optional(),
    transform: TransformSchema,
  }),
  z.object({
    type: z.literal("sticker"),
    id: z.string(),
    assetId: z.string(),
    transform: TransformSchema,
    /** render as an app icon: squircle mask + subtle shadow, fixed square size */
    iconMask: z.enum(["ios", "android", "square"]).optional(),
  }),
]);

export const LayerSchema = z.union([MockupLayerSchema, TextLayerSchema, StickerLayerSchema]);

/* --------------------------------- timeline ---------------------------------- */
// Animation-ready from v1: validated, ignored by the UI until phase 2.

export const KeyframeSchema = z.object({
  t: z.number().min(0),
  value: z.number(),
  easing: z.union([
    z.enum(["linear", "ease-in-out", "spring"]),
    z.tuple([z.number(), z.number(), z.number(), z.number()]), // cubic bezier
  ]),
});

export const TimelineSchema = z.object({
  durationMs: z.number().positive(),
  fps: z.union([z.literal(30), z.literal(60)]),
  tracks: z.array(
    z.object({
      layerId: z.string(), // or 'camera'
      property: z.enum([
        "transform.x",
        "transform.y",
        "transform.scale",
        "transform.tiltX",
        "transform.tiltY",
        "opacity",
        "camera.zoom",
        "camera.x",
        "camera.y",
      ]),
      keyframes: z.array(KeyframeSchema),
    })
  ),
  presets: z.array(z.string()).optional(),
});

/* ----------------------------------- scene ----------------------------------- */

export const SceneDecorationSchema = z.object({
  kind: z.enum(["none", "shadow-overlay", "shapes"]),
  presetId: z.string(),
  intensity: z.number().min(0).max(1),
});

export const SceneDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string(),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    background: BackgroundSchema,
    effects: z.array(EffectSchema).optional(),
    backdrop: BackdropSchema.optional(),
    scene: SceneDecorationSchema.optional(),
    /** rounded canvas corners; exports keep transparency outside the radius */
    cornerRadius: z.number().min(0).optional(),
    /** decorative ring drawn just inside the canvas edge */
    border: z.object({ width: z.number().min(0), color: z.string() }).optional(),
  }),
  layers: z.array(LayerSchema), // z-ordered, index 0 = back
  timeline: TimelineSchema.optional(),
});

/* ----------------------------------- types ----------------------------------- */

export type GradientStop = z.infer<typeof GradientStopSchema>;
export type Transform = z.infer<typeof TransformSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Backdrop = z.infer<typeof BackdropSchema>;
export type Shadow = z.infer<typeof ShadowSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type MockupLayer = z.infer<typeof MockupLayerSchema>;
export type TextLayer = z.infer<typeof TextLayerSchema>;
export type StickerLayer = z.infer<typeof StickerLayerSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type SceneDocument = z.infer<typeof SceneDocumentSchema>;
