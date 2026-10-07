import type { Layer, SceneDocument } from "@framekit/scene";
import { memo, type CSSProperties, type ReactNode } from "react";
import { backgroundToCss } from "./background";
import { backdropFilterCss, overlayStyle, patternStyle, portraitBlur, stageStyle } from "./backdrop";
import { MockupLayerViewMemo } from "./MockupLayerView";
import { AnnotationGraphic } from "./annotations";
import type { ResolveAsset } from "./types";
import { blockAnimStyle, pieceAnimStyle, splitPieces, textAnimProgress, typewriterCount } from "./textAnim";

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
  panoramaIdx,
  panoramaTotal,
  onBlurZonesChange,
  textTime,
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
  panoramaIdx?: number;
  panoramaTotal?: number;
  onBlurZonesChange?: (layerId: string, zones: Array<{ x: number; y: number; w: number; h: number }>) => void;
  /** clip time (ms) for text animations; omitted = every text shown finished */
  textTime?: number | null;
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
          ...backgroundToCss(bg, canvas.panoramaBackground ? panoramaIdx : undefined, canvas.panoramaBackground ? panoramaTotal : undefined),
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
        return <div style={{ ...common, ...backgroundToCss(bg, canvas.panoramaBackground ? panoramaIdx : undefined, canvas.panoramaBackground ? panoramaTotal : undefined) }} />;
      })()}

      {/* Portrait stage — spotlight glow + floor, behind the subject */}
      {backdrop?.portrait?.mode === "stage" && <div style={stageStyle(backdrop.portrait)} />}

      {/* Pattern — repeating decoration behind the subject */}
      {backdrop?.pattern && <div style={patternStyle(backdrop.pattern)} />}

      {[...scene.layers].sort((a, b) => {
        const aBackground = a.type === "sticker" && "assetId" in a && a.placement === "background";
        const bBackground = b.type === "sticker" && "assetId" in b && b.placement === "background";
        return Number(aBackground) - Number(bBackground);
      }).map((layer) => (
        <LayerView
          key={`${layer.id}-${animateLayerId === layer.id ? animationNonce : 0}`}
          layer={layer}
          resolveAsset={resolveAsset}
          entrance={animateLayerId === layer.id}
          onBlurZonesChange={onBlurZonesChange}
          textTime={layer.type === "text" && layer.animation ? textTime : undefined}
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
        const pad = Math.round(canvas.width * 0.02);
        const fs = Math.max(15, Math.round(canvas.width * 0.017));
        const iconS = fs * 1.5;
        return (
          // refined corner badge — matches the baked export watermark + <BrandMark>
          <div
            style={{
              position: "absolute",
              right: pad,
              bottom: pad,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: fs * 0.6,
              padding: `${fs * 0.6}px ${fs * 0.95}px`,
              borderRadius: 999,
              background: "rgba(9,9,12,0.66)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: fs,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "grid",
                placeItems: "center",
                width: iconS,
                height: iconS,
                borderRadius: iconS * 0.28,
                background: "linear-gradient(135deg,#8b5cf6,#d946ef,#22d3ee)",
              }}
            >
              <svg width={iconS * 0.6} height={iconS * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.4V6.3A2.3 2.3 0 0 1 6.3 4H8.4" />
                <path d="M15.6 4h2.1A2.3 2.3 0 0 1 20 6.3v2.1" />
                <path d="M20 15.6v2.1a2.3 2.3 0 0 1-2.3 2.3h-2.1" />
                <path d="M8.4 20H6.3A2.3 2.3 0 0 1 4 17.7v-2.1" />
              </svg>
              <span style={{ position: "absolute", width: iconS * 0.2, height: iconS * 0.2, borderRadius: 2.5, background: "#fff" }} />
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              <span style={{ color: "rgba(255,255,255,0.62)", fontWeight: 500 }}>Made with </span>
              <span style={{ color: "#ffffff", fontWeight: 700 }}>MockFrame</span>
            </span>
          </div>
        );
      })()}

      {/* Magnetic Connector Lines */}
      {scene.connectors && scene.connectors.length > 0 && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            width: "100%",
            height: "100%",
            zIndex: 1000,
          }}
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        >
          {scene.connectors.map((c) => {
            const fromLayer = scene.layers.find((l) => l.id === c.fromLayerId);
            const toLayer = scene.layers.find((l) => l.id === c.toLayerId);
            if (!fromLayer || !toLayer) return null;

            const fromX = canvas.width / 2 + fromLayer.transform.x;
            const fromY = canvas.height / 2 + fromLayer.transform.y;
            const toX = canvas.width / 2 + toLayer.transform.x;
            const toY = canvas.height / 2 + toLayer.transform.y;

            const color = c.color || "#635bff";
            const thickness = c.thickness || 3;
            const dashArray = c.dashArray || undefined;
            const arrowHead = c.arrowHead !== false;

            return (
              <g key={c.id}>
                {arrowHead && (
                  <defs>
                    <marker
                      id={`arrow-${c.id}`}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={color} />
                    </marker>
                  </defs>
                )}
                <path
                  d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
                  stroke={color}
                  strokeWidth={thickness}
                  strokeDasharray={dashArray}
                  markerEnd={arrowHead ? `url(#arrow-${c.id})` : undefined}
                  fill="none"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

const LayerView = memo(function LayerView({
  layer,
  resolveAsset,
  entrance,
  onBlurZonesChange,
  textTime,
}: {
  layer: Layer;
  resolveAsset: ResolveAsset;
  entrance?: boolean;
  textTime?: number | null;
  onBlurZonesChange?: (layerId: string, zones: Array<{ x: number; y: number; w: number; h: number }>) => void;
}) {
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
        <MockupLayerViewMemo
          layer={layer}
          resolveAsset={resolveAsset}
          onBlurZonesChange={onBlurZonesChange ? (zones) => onBlurZonesChange(layer.id, zones) : undefined}
        />
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
    // text animation (only while a clip time is given: previews and video frames)
    const anim = textTime != null ? layer.animation : undefined;
    const p = textAnimProgress(anim, textTime);
    let body: ReactNode = layer.content;
    let animStyle: CSSProperties | null = null;
    let pieceGradient = false;
    if (anim) {
      if (anim.type === "typewriter") {
        const chars = Array.from(layer.content);
        const shown = typewriterCount(layer.content, p);
        // the unrevealed rest keeps its space so centred / wrapped text never reflows
        body = shown >= chars.length ? layer.content : (
          <>
            {chars.slice(0, shown).join("")}
            <span style={{ opacity: 0 }}>{chars.slice(shown).join("")}</span>
          </>
        );
      } else if (anim.type === "words" || anim.type === "letters") {
        // gradient fills can't reach through animated pieces from the parent: each piece carries it
        pieceGradient = !!grad;
        const pieces = splitPieces(layer.content, anim.type);
        const total = pieces.filter((x) => x.animated).length;
        let n = -1;
        const piece = (x: { text: string; animated: boolean }, key: number) => {
          if (!x.animated) return x.text;
          n += 1;
          return (
            <span
              key={key}
              style={{
                display: "inline-block",
                ...(pieceGradient ? { backgroundImage: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}),
                ...pieceAnimStyle(p, n, total),
              }}
            >
              {x.text}
            </span>
          );
        };
        if (anim.type === "letters") {
          // letters of one word stay together so the line breaks exactly as the static text does
          const words = layer.content.split(/(\s+)/).filter((w) => w.length > 0);
          let k = 0;
          body = words.map((w, wi) =>
            /^\s+$/.test(w) ? w : (
              <span key={`w${wi}`} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                {splitPieces(w, "letters").map((x) => piece(x, k++))}
              </span>
            )
          );
        } else {
          body = pieces.map(piece);
        }
      } else {
        animStyle = blockAnimStyle(anim.type, p);
      }
    }
    const baseText: CSSProperties = pieceGradient
      ? { ...textStyle, color: undefined, backgroundImage: undefined, WebkitBackgroundClip: undefined, backgroundClip: undefined }
      : textStyle;
    const innerStyle: CSSProperties = animStyle ? { ...baseText, ...animStyle } : baseText;
    // gradient text + highlight can't share `background`; wrap the highlight box
    if (grad && hl) {
      return (
        <div data-layer-id={layer.id} style={wrapper}>
          <div style={{ background: hl.color, padding: `${hl.padY}px ${hl.padX}px`, borderRadius: hl.radius, display: "inline-block", ...animStyle }}>
            <div style={{ ...baseText, background: undefined, padding: undefined, borderRadius: undefined }}>{body}</div>
          </div>
        </div>
      );
    }
    return (
      <div data-layer-id={layer.id} style={wrapper}>
        <div style={innerStyle}>{body}</div>
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
        <img
          src={asset.url}
          alt=""
          width={asset.width}
          height={asset.height}
          style={{
            display: "block",
            maxWidth: "none",
            opacity: layer.opacity ?? 1,
            filter: STICKER_SHADOW[layer.shadow ?? "none"],
          }}
          crossOrigin="anonymous"
        />
      </div>
    );
  }

  if (layer.type === "sticker" && "stickerId" in layer) {
    return (
      <div data-layer-id={layer.id} style={wrapper}>
      <AnnotationGraphic id={layer.stickerId} tint={layer.tint ?? "#7c3aed"} size={layer.size} />
      </div>
    );
  }

  return null;
});

export const SceneRenderer = memo(SceneRendererImpl);

/** silhouette shadows for asset stickers (drop-shadow follows transparency) */
const STICKER_SHADOW: Record<string, string | undefined> = {
  none: undefined,
  soft: "drop-shadow(0 6px 10px rgba(20,20,40,0.22))",
  lifted: "drop-shadow(0 18px 22px rgba(20,20,40,0.3)) drop-shadow(0 3px 5px rgba(20,20,40,0.18))",
};
