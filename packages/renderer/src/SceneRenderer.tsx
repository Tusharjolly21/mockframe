import type { Layer, SceneDocument } from "@framekit/scene";
import { memo, type CSSProperties } from "react";
import { backgroundToCss } from "./background";
import { backdropFilterCss, overlayStyle, patternStyle, portraitBlur, stageStyle } from "./backdrop";
import { MockupLayerViewMemo } from "./MockupLayerView";
import type { ResolveAsset } from "./types";

/**
 * The one renderer. A pure function of the scene document — it runs in the
 * browser editor, in headless Chromium for exports, and in JSDOM for tests.
 * No fetches, no app imports, no editor chrome. Selection UI must stay outside.
 */
/** Seeded SVG turbulence tile — deterministic, so exports match the editor. */
export function noiseTile(seed: number, baseFrequency: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function SceneRendererImpl({
  scene,
  resolveAsset,
  className,
  style,
  watermark = false,
  animateLayerId,
  animationNonce = 0,
}: {
  scene: SceneDocument;
  resolveAsset: ResolveAsset;
  className?: string;
  style?: CSSProperties;
  /** free-tier watermark baked into the export (removed by a paid plan later) */
  watermark?: boolean;
  /** Editor-only entrance animation. Omitted for deterministic exports. */
  animateLayerId?: string | null;
  animationNonce?: number;
}) {
  const { canvas } = scene;
  const bg = canvas.background;
  const backdrop = canvas.backdrop;
  const vignette = canvas.effects?.find((e) => e.type === "vignette");
  const noise = canvas.effects?.find((e) => e.type === "noise");
  const grain = canvas.effects?.find((e) => e.type === "grain");

  // backdrop-only filter: the background renders in its own layer so blur /
  // saturation / opacity never touch the devices (inset compensates blur bleed)
  const bgFilter = backdrop?.filter ? backdropFilterCss(backdrop.filter) : undefined;
  const blurPad = backdrop?.filter?.blur ? Math.ceil(backdrop.filter.blur * 2) : 0;

  return (
    <div
      className={className}
      data-scene-id={scene.id}
      style={{
        position: "relative",
        width: canvas.width,
        height: canvas.height,
        overflow: "hidden",
        borderRadius: canvas.cornerRadius || undefined,
        ...style,
      }}
    >
      {/* background layer (filterable) */}
      <div
        style={{
          position: "absolute",
          inset: -blurPad,
          pointerEvents: "none",
          filter: bgFilter,
          ...backgroundToCss(bg),
        }}
      >
        {bg.type === "image" && (() => {
          const asset = resolveAsset(bg.assetId);
          if (!asset) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: bg.fit,
                filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
                opacity: bg.opacity,
              }}
              crossOrigin="anonymous"
            />
          );
        })()}
      </div>

      {/* Portrait blur — a depth-of-field copy of the background, sharp at the
          focal point and blurred toward the edges (painted over the crisp bg). */}
      {backdrop?.portrait?.mode === "blur" && (() => {
        const { blurPx, mask } = portraitBlur(backdrop.portrait);
        const common: CSSProperties = {
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          filter: `blur(${blurPx}px)`,
          WebkitMaskImage: mask,
          maskImage: mask,
        };
        if (bg.type === "image") {
          const asset = resolveAsset(bg.assetId);
          if (!asset) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt="" crossOrigin="anonymous" style={{ ...common, width: "100%", height: "100%", objectFit: bg.fit, opacity: bg.opacity }} />
          );
        }
        return <div style={{ ...common, ...backgroundToCss(bg) }} />;
      })()}

      {/* Portrait stage — spotlight glow + floor, behind the subject */}
      {backdrop?.portrait?.mode === "stage" && <div style={stageStyle(backdrop.portrait)} />}

      {/* Pattern — repeating decoration behind the subject */}
      {backdrop?.pattern && <div style={patternStyle(backdrop.pattern)} />}

      {scene.layers.map((layer) => (
        <LayerView
          key={`${layer.id}-${animateLayerId === layer.id ? animationNonce : 0}`}
          layer={layer}
          resolveAsset={resolveAsset}
          entrance={animateLayerId === layer.id}
        />
      ))}

      {/* Overlay — cast light / shadow over the whole scene, blended */}
      {backdrop?.overlay && <div style={overlayStyle(backdrop.overlay)} />}

      {vignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at center, transparent 55%, ${vignette.color} 145%)`,
            opacity: vignette.intensity,
          }}
        />
      )}
      {noise && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: noiseTile(2, 0.9),
            opacity: noise.intensity * 0.45,
            mixBlendMode: "overlay",
          }}
        />
      )}
      {grain && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: noiseTile(grain.seed, 0.22),
            opacity: grain.intensity * 0.55,
            mixBlendMode: "soft-light",
          }}
        />
      )}
      {canvas.border && canvas.border.width > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            border: `${canvas.border.width}px solid ${canvas.border.color}`,
            borderRadius: canvas.cornerRadius || undefined,
          }}
        />
      )}

      {watermark && (() => {
        const pad = Math.round(canvas.width * 0.018);
        const badgeFs = Math.max(16, Math.round(canvas.width * 0.018));
        return (
          <>
            {/* single subtle corner badge — no full-canvas tiling (looks clean, still credits) */}
            <div
              style={{
                position: "absolute",
                right: pad,
                bottom: pad,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: badgeFs * 0.4,
                padding: `${badgeFs * 0.5}px ${badgeFs * 0.85}px`,
                borderRadius: 999,
                background: "rgba(15,16,22,0.62)",
                color: "#ffffff",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: badgeFs,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: badgeFs * 1.35,
                  height: badgeFs * 1.35,
                  borderRadius: badgeFs * 0.4,
                  background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                  fontSize: badgeFs * 0.8,
                }}
              >
                ◆
              </span>
              Made with MockFrame
            </div>
          </>
        );
      })()}
    </div>
  );
}

const LayerView = memo(function LayerView({ layer, resolveAsset, entrance }: { layer: Layer; resolveAsset: ResolveAsset; entrance?: boolean }) {
  const t = layer.transform;
  const wrapper: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: `translate(-50%, -50%) translate(calc(${t.x}px + var(--fk-drag-x, 0px)), calc(${t.y}px + var(--fk-drag-y, 0px))) rotate(calc(${t.rotate}deg + var(--fk-drag-rotate, 0deg))) scale(calc(${t.scale} * var(--fk-drag-scale, 1)))`,
    transformOrigin: "center",
    animation: entrance ? "fk-device-enter 620ms cubic-bezier(0.2, 0.85, 0.25, 1) both" : undefined,
  };

  if (layer.type === "mockup") {
    return (
      <div data-layer-id={layer.id} style={wrapper}>
        <MockupLayerViewMemo layer={layer} resolveAsset={resolveAsset} />
      </div>
    );
  }

  if (layer.type === "text") {
    const grad = layer.gradient && layer.gradient.length >= 2
      ? `linear-gradient(180deg, ${layer.gradient.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(", ")})`
      : undefined;
    const hl = layer.highlight;
    const textStyle: CSSProperties = {
      transform: `perspective(${t.perspective}px) rotateX(${t.tiltX}deg) rotateY(${t.tiltY}deg)`,
      fontFamily: `'${layer.font.family}', system-ui, sans-serif`,
      fontWeight: layer.font.weight,
      fontStyle: layer.italic ? "italic" : undefined,
      fontSize: layer.font.size,
      lineHeight: layer.font.lineHeight,
      letterSpacing: `${layer.font.letterSpacing}em`,
      textTransform: layer.uppercase ? "uppercase" : undefined,
      textAlign: layer.align,
      whiteSpace: layer.maxWidth ? "pre-wrap" : "pre",
      // RTL support: paragraph direction follows the content's first strong
      // character, so Arabic/Hebrew text lays out correctly with zero config
      unicodeBidi: "plaintext",
      width: layer.maxWidth ?? "max-content",
      maxWidth: layer.maxWidth ?? undefined,
      textShadow: layer.shadow ? `${layer.shadow.x}px ${layer.shadow.y}px ${layer.shadow.blur}px ${layer.shadow.color}` : undefined,
      WebkitTextStrokeWidth: layer.stroke ? layer.stroke.width : undefined,
      WebkitTextStrokeColor: layer.stroke ? layer.stroke.color : undefined,
      paintOrder: layer.stroke ? "stroke fill" : undefined,
      ...(grad
        ? { color: "transparent", backgroundImage: grad, WebkitBackgroundClip: "text", backgroundClip: "text" }
        : { color: layer.color }),
      ...(hl
        ? {
            background: grad ? undefined : hl.color,
            // when both gradient text + highlight: box the highlight on the wrapper instead
            padding: `${hl.padY}px ${hl.padX}px`,
            borderRadius: hl.radius,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }
        : {}),
    };
    // gradient text + highlight can't share `background`; wrap the highlight box
    if (grad && hl) {
      return (
        <div data-layer-id={layer.id} style={wrapper}>
          <div style={{ background: hl.color, padding: `${hl.padY}px ${hl.padX}px`, borderRadius: hl.radius, display: "inline-block" }}>
            <div style={{ ...textStyle, background: undefined, padding: undefined, borderRadius: undefined }}>{layer.content}</div>
          </div>
        </div>
      );
    }
    return (
      <div data-layer-id={layer.id} style={wrapper}>
        <div style={textStyle}>{layer.content}</div>
      </div>
    );
  }

  if (layer.type === "sticker" && "assetId" in layer) {
    const asset = resolveAsset(layer.assetId);
    if (!asset) return null;
    // app-icon mode: fixed 512 square, cover-cropped into a platform mask + shadow
    if ("iconMask" in layer && layer.iconMask) {
      const S = 512;
      const radius = layer.iconMask === "square" ? S * 0.04 : layer.iconMask === "android" ? S * 0.5 : S * 0.2237;
      return (
        <div data-layer-id={layer.id} style={wrapper}>
          <div
            style={{
              width: S,
              height: S,
              borderRadius: radius,
              overflow: "hidden",
              backgroundImage: `url(${asset.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 24px 60px rgba(20,20,40,0.28)",
            }}
          />
        </div>
      );
    }
    return (
      <div data-layer-id={layer.id} style={wrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt="" width={asset.width} height={asset.height} style={{ display: "block", maxWidth: "none" }} crossOrigin="anonymous" />
      </div>
    );
  }

  if (layer.type === "sticker" && "stickerId" in layer) {
    return (
      <div data-layer-id={layer.id} style={wrapper}>
      <BuiltinSticker id={layer.stickerId} tint={layer.tint ?? "#7c3aed"} size={layer.size} />
      </div>
    );
  }

  return null;
});

export const SceneRenderer = memo(SceneRendererImpl);

function BuiltinSticker({ id, tint, size }: { id: string; tint: string; size?: { width: number; height: number } }) {
  if (id === "annot-arrow") {
    // contrast casing under the stroke so the arrow stays visible on ANY
    // background (user report: arrows disappearing on same-tone backdrops)
    const casing = tintLuma(tint) > 0.55 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.85)";
    return (
      <svg width="330" height="150" viewBox="0 0 330 150" fill="none" style={{ display: "block", overflow: "visible" }}>
        <path d="M24 112 C94 42 172 35 285 41" stroke={casing} strokeWidth="24" strokeLinecap="round" />
        <path d="M278 21 L321 43 L278 63 Z" fill={casing} stroke={casing} strokeWidth="6" strokeLinejoin="round" />
        <path
          d="M24 112 C94 42 172 35 285 41"
          stroke={tint}
          strokeWidth="18"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 7px 7px rgba(0,0,0,0.26))" }}
        />
        <path d="M278 21 L321 43 L278 63 Z" fill={tint} style={{ filter: "drop-shadow(0 7px 7px rgba(0,0,0,0.24))" }} />
        <path d="M25 112 C95 42 173 35 286 41" stroke="rgba(255,255,255,0.56)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "annot-highlight") {
    return (
      <div
        style={{
          width: 360,
          height: 106,
          borderRadius: 24,
          background: tint,
          opacity: 0.54,
          boxShadow: `0 12px 34px ${hexToRgba(tint, 0.22)}`,
          mixBlendMode: "multiply",
        }}
      />
    );
  }

  if (id === "annot-redact") {
    return (
      <div
        style={{
          width: 360,
          height: 96,
          borderRadius: 18,
          background: tint,
          boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
        }}
      />
    );
  }

  if (id === "annot-blur") {
    return (
      <div
        style={{
          width: size?.width ?? 360,
          height: size?.height ?? 118,
          borderRadius: 22,
          background: hexToRgba(tint, 0.18),
          border: `1px solid ${hexToRgba(tint, 0.46)}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 28px rgba(20,20,40,0.16)",
          backdropFilter: "blur(14px) saturate(1.25)",
          WebkitBackdropFilter: "blur(14px) saturate(1.25)",
        }}
      />
    );
  }

  if (id.startsWith("annot-kbd-")) {
    // shortcut hint in a speech bubble — keys split on "+" render as kbd chips
    const combo = id.slice("annot-kbd-".length) || "⌘+K";
    const keys = combo.split("+").map((k) => k.trim()).filter(Boolean);
    return (
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "18px 22px",
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 12px 30px rgba(20,20,40,0.25)",
        }}
      >
        {keys.map((k, i) => (
          <span
            key={i}
            style={{
              display: "grid",
              placeItems: "center",
              minWidth: 44,
              height: 46,
              padding: "0 12px",
              borderRadius: 10,
              background: "#f4f4f8",
              border: "1px solid #d9d9e3",
              borderBottom: "3px solid #c6c6d4",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: tint,
              whiteSpace: "nowrap",
            }}
          >
            {k}
          </span>
        ))}
        <span
          style={{
            position: "absolute",
            left: 26,
            bottom: -9,
            width: 20,
            height: 20,
            background: "#ffffff",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 4,
            transform: "rotate(45deg)",
          }}
        />
      </div>
    );
  }

  if (id.startsWith("annot-step-")) {
    const n = id.slice("annot-step-".length);
    return (
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ display: "block", overflow: "visible" }}>
        <circle cx="64" cy="64" r="47" fill={tint} />
        <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="9" />
        <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="2" />
        <text
          x="64"
          y={n.length > 1 ? 74 : 78}
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize={n.length > 1 ? 40 : 50}
          fontWeight="850"
          fill="#ffffff"
        >
          {n}
        </text>
      </svg>
    );
  }

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: "block" }}>
      <rect x="14" y="14" width="132" height="132" rx="28" fill={tint} />
    </svg>
  );
}

/** relative luminance 0..1 of a #rrggbb tint (non-hex → treat as mid) */
function tintLuma(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0.5;
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function hexToRgba(hex: string, alpha: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
