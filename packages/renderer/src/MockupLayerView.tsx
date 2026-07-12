import { getDevice, getVariant, type Device } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { memo, type CSSProperties } from "react";
import { shadowToFilter } from "./shadow";
import { quadMatrix3d, rectToQuad } from "./quad";
import type { ResolvedAsset } from "./types";

function mediaPlacement(
  rect: { x: number; y: number; width: number; height: number },
  asset: ResolvedAsset,
  media: NonNullable<MockupLayer["media"]>
) {
  const iw = asset.width || rect.width;
  const ih = asset.height || rect.height;
  if (media.fit === "fill") {
    // STRETCH fills the screen exactly, corner-to-corner, ignoring aspect ratio.
    // Pan/zoom (offset/scale) are meaningless here — they'd only leave a gap or
    // crop — so ignore them: "Stretch" must always fill, even if a prior Fill/Fit
    // left a stale offset or zoom on the layer.
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  }
  const base =
    media.fit === "cover"
      ? Math.max(rect.width / iw, rect.height / ih)
      : Math.min(rect.width / iw, rect.height / ih);
  const s = base * media.scale;
  const w = iw * s;
  const h = ih * s;
  return {
    x: rect.x + (rect.width - w) / 2 + media.offsetX,
    y: rect.y + (rect.height - h) / 2 + media.offsetY,
    w,
    h,
  };
}

/** Empty screens show wallpaper art (not black glass) so even a fresh scene
    looks like a real device — matches how premium mockup tools present frames. */
function ScreenPlaceholder({ device, layerId }: { device: Device; layerId: string }) {
  const rect = device.frame.screenRect;
  const p = `fkph_${device.id}_${layerId}`;

  if (device.category === "browser") {
    const r = rect;
    return (
      <g>
        <rect x={r.x} y={r.y} width={r.width} height={r.height} fill="#f6f7f9" />
        <rect x={r.x + r.width * 0.06} y={r.y + r.height * 0.08} width={r.width * 0.42} height={r.height * 0.06} rx={(r.height * 0.06) / 2} fill="#e2e5ea" />
        <rect x={r.x + r.width * 0.06} y={r.y + r.height * 0.2} width={r.width * 0.88} height={r.height * 0.4} rx={28} fill="#e9ecf1" />
        <rect x={r.x + r.width * 0.06} y={r.y + r.height * 0.66} width={r.width * 0.42} height={r.height * 0.22} rx={24} fill="#eef0f4" />
        <rect x={r.x + r.width * 0.52} y={r.y + r.height * 0.66} width={r.width * 0.42} height={r.height * 0.22} rx={24} fill="#eef0f4" />
      </g>
    );
  }

  // Empty screens must READ as empty (PostSpark-style): a white graph-paper
  // placeholder inside the glass — a colorful wallpaper looks like content and
  // hides the "add your screenshot" affordance.
  const g = Math.max(18, Math.round(rect.width * 0.06));
  return (
    <g>
      <defs>
        <pattern id={`${p}_grid`} width={g} height={g} patternUnits="userSpaceOnUse" x={rect.x} y={rect.y}>
          <path d={`M ${g} 0 H 0 V ${g}`} fill="none" stroke="rgba(24,26,48,0.08)" strokeWidth={Math.max(1.5, g * 0.045)} />
        </pattern>
        <radialGradient id={`${p}_vig`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.72" stopColor="#0b0d1a" stopOpacity="0" />
          <stop offset="1" stopColor="#0b0d1a" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="#ffffff" />
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={`url(#${p}_grid)`} />
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={`url(#${p}_vig)`} />
    </g>
  );
}

export function MockupLayerView({
  layer,
  resolveAsset,
  onMediaLoad,
}: {
  layer: MockupLayer;
  resolveAsset: (assetId: string) => ResolvedAsset | undefined;
  onMediaLoad?: () => void;
}) {
  const tiltStyle: CSSProperties = {
    transform: `perspective(${layer.transform.perspective}px) rotateX(calc(${layer.transform.tiltX}deg + var(--fk-drag-tilt-x, 0deg))) rotateY(calc(${layer.transform.tiltY}deg + var(--fk-drag-tilt-y, 0deg)))`,
    filter: layer.shadow ? shadowToFilter(layer.shadow, layer.transform) : undefined,
  };

  /* ------------------------------ frameless ------------------------------ */
  if (!layer.deviceId) {
    const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
    if (!asset) return null;
    const style = layer.screenshotStyle ?? "default";
    const radius = layer.cornerRadius ?? 24;
    const glass = style.startsWith("glass") || style === "liquid-glass";
    const glassDark = style === "glass-dark";
    const pad = glass ? Math.max(asset.width, asset.height) * 0.015 : 0;
    return (
      <div data-layer-content="true" style={tiltStyle}>
        <div
          style={{
            padding: pad,
            borderRadius: radius + pad,
            background: glass
              ? glassDark
                ? "rgba(15,18,28,0.55)"
                : "rgba(255,255,255,0.45)"
              : undefined,
            border:
              style === "outline"
                ? `${Math.max(2, asset.width * 0.004)}px solid rgba(255,255,255,0.75)`
                : glass
                  ? `1px solid ${glassDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)"}`
                  : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt=""
            width={asset.width}
            height={asset.height}
            style={{ display: "block", borderRadius: radius, maxWidth: "none" }}
            onLoad={onMediaLoad}
            crossOrigin="anonymous"
          />
        </div>
      </div>
    );
  }

  const device = getDevice(layer.deviceId);
  if (!device) return null;

  /* --------------------------- raster photo scene ------------------------- */
  // A "scene" device (hand/desk/pocket photo) renders the screenshot BEHIND a
  // foreground PNG plate whose transparent screen-hole + baked occlusion do the
  // masking. The screenshot is warped onto the screen quad via CSS matrix3d, so
  // ANGLED (perspective) scenes work — an axis-aligned scene is just a rect quad.
  if (device.plate) {
    const plate = device.plate;
    const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
    const quad = plate.screenQuad ?? rectToQuad(plate.screenRect);
    // size the warp source box to the SCREEN's aspect (not the foreshortened quad
    // edge lengths) so a screen-res screenshot maps corner-to-corner with no crop
    // or aspect distortion, even under steep perspective
    const sw = device.screen.width;
    const sh = device.screen.height;
    // corner radius in screen-res space (the box is now screen-sized)
    const rad = device.screen.cornerRadius;
    // screen centre in plate coords — the editor's ⊕ anchors here (NOT the layer
    // box centre, which on an off-centre screen would put the button on the body)
    const scx = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
    const scy = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4;
    // Coverage strategy depends on plate type:
    // • bezelMask (bodied: watch/mac/ipad-duo/hand) — an opaque body surrounds the
    //   hole, so OUTSET generously + SQUARE corners: content fills the full glass
    //   corner-to-corner and the body masks the overshoot. Fixes the corner wedges
    //   a rounded clip box leaves against the hole's real rounded corners.
    // • frame-edge "hole" plates (thin outline, no masking body) — EXACT box; any
    //   outset would spill past the device edge onto the page.
    // • "under" (custom opaque photos) — EXACT, no masking plate at all.
    const bezelMask = plate.mode !== "under" && plate.bezelMask;
    const OUTSET = bezelMask ? 0.06 : 0;
    const boxRadius = bezelMask ? 0 : rad;
    const warpQuad = (OUTSET
      ? quad.map(([x, y]) => [x + (x - scx) * OUTSET, y + (y - scy) * OUTSET])
      : quad) as typeof quad;
    // "hole" plates (extracted PSDs) sit ON TOP — their transparent screen hole
    // masks the screenshot and bakes occlusion. "under" plates are ordinary
    // opaque photos (user-calibrated customs) — they sit BELOW and the warped
    // screenshot paints over the photographed screen area.
    const under = plate.mode === "under";
    const plateImg = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={plate.src}
        alt=""
        width={plate.width}
        height={plate.height}
        onLoad={onMediaLoad}
        crossOrigin="anonymous"
        style={{ position: "absolute", top: 0, left: 0, width: plate.width, height: plate.height, display: "block" }}
      />
    );
    const screenContent = (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: sw,
          height: sh,
          transform: quadMatrix3d(sw, sh, warpQuad),
          transformOrigin: "0 0",
          overflow: "hidden",
          borderRadius: boxRadius,
          isolation: "isolate",
          background: "#07090d",
          boxShadow: "inset 0 0 42px rgba(0,0,0,0.26), inset 0 0 2px rgba(255,255,255,0.48)",
        }}
      >
        {asset && layer.media ? (
          (() => {
            // place the screenshot within the screen box (screen-res space) so
            // it can be panned (offsetX/Y) and zoomed (scale); overflow:hidden
            // on the box keeps it clipped inside the selected screen area
            const placed = mediaPlacement({ x: 0, y: 0, width: sw, height: sh }, asset, layer.media);
            return (
              <>
                {layer.media.bg && (
                  <div style={{ position: "absolute", inset: 0, background: layer.media.bg }} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt=""
                  onLoad={onMediaLoad}
                  crossOrigin="anonymous"
                  style={{
                    position: "absolute",
                    left: `calc(${placed.x}px + var(--fk-media-dx, 0px))`,
                    top: `calc(${placed.y}px + var(--fk-media-dy, 0px))`,
                    width: placed.w,
                    height: placed.h,
                    maxWidth: "none",
                    display: "block",
                    filter: "saturate(0.98) contrast(1.02)",
                  }}
                />
              </>
            );
          })()
        ) : (
          // empty screen reads EMPTY: white graph-paper placeholder (PostSpark-style)
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#ffffff",
              backgroundImage:
                `linear-gradient(rgba(24,26,48,0.08) ${Math.max(1.5, sw * 0.0027)}px, transparent ${Math.max(1.5, sw * 0.0027)}px),` +
                `linear-gradient(90deg, rgba(24,26,48,0.08) ${Math.max(1.5, sw * 0.0027)}px, transparent ${Math.max(1.5, sw * 0.0027)}px)`,
              backgroundSize: `${Math.max(18, Math.round(sw * 0.06))}px ${Math.max(18, Math.round(sw * 0.06))}px`,
              boxShadow: "inset 0 0 60px rgba(11,13,26,0.06)",
            }}
          />
        )}
        {/* subtle glass sheen so the screen reads as real glass, not a flat sticker */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(118deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 12%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.06) 100%)",
            boxShadow: "inset 0 0 34px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.22)",
          }}
        />
      </div>
    );
    return (
      <div data-layer-content="true" style={tiltStyle}>
        <div style={{ position: "relative", width: plate.width, height: plate.height }}>
          <div data-screen-anchor style={{ position: "absolute", left: scx, top: scy, width: 0, height: 0 }} />
          {under && plateImg}
          {/* Photoshop's rounded screen opening is an irregular raster mask, not
              the Smart Object transform rectangle. Apply it in plate space. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              ...(plate.screenMask
                ? {
                    maskImage: `url(${plate.screenMask})`,
                    WebkitMaskImage: `url(${plate.screenMask})`,
                    maskSize: "100% 100%",
                    WebkitMaskSize: "100% 100%",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                  }
                : {}),
            }}
          >
            {screenContent}
          </div>
          {/* foreground plate: frame, hand, shadows — transparent over the screen */}
          {!under && plateImg}
        </div>
      </div>
    );
  }

  /* ------------------------------- framed -------------------------------- */
  const variant = getVariant(device, layer.frameVariant);
  const { frame } = device;
  const rect = frame.screenRect;
  const clipId = `fkclip_${device.id}_${layer.id}`;
  const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  const placed = asset && layer.media ? mediaPlacement(rect, asset, layer.media) : null;

  // decorative ring around the frame (border feature); radius approximates the
  // device body radius from bezel + screen corner radius
  const bodyRadius = device.screen.cornerRadius + rect.x;
  const borderStyle: CSSProperties | undefined = layer.border
    ? {
        padding: layer.border.inset,
        border: `${layer.border.width}px solid ${typeof layer.border.color === "string" ? layer.border.color : layer.border.color[0]?.color ?? "#ffffff"}`,
        borderRadius: bodyRadius + layer.border.inset,
      }
    : undefined;

  return (
    <div data-layer-content="true" style={tiltStyle}>
      <div style={borderStyle}>
      <div style={{ position: "relative" }}>
      {/* ⊕ anchor at the true screen centre (frame coords map 1:1 to CSS px here) */}
      <div data-screen-anchor style={{ position: "absolute", left: rect.x + rect.width / 2, top: rect.y + rect.height / 2, width: 0, height: 0 }} />
      <svg
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        width={frame.width}
        height={frame.height}
        style={{ display: "block" }}
      >
        <g dangerouslySetInnerHTML={{ __html: variant.body }} />
        <clipPath id={clipId}>
          <path d={frame.maskPath} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {placed && asset ? (
            <>
              {/* letterbox fill behind contain-fit media */}
              {layer.media?.bg && (
                <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={layer.media.bg} />
              )}
              <image
                href={asset.url}
                x={placed.x}
                y={placed.y}
                width={placed.w}
                height={placed.h}
                preserveAspectRatio="none"
                onLoad={onMediaLoad}
              />
            </>
          ) : (
            <ScreenPlaceholder device={device} layerId={layer.id} />
          )}
        </g>
        <g dangerouslySetInnerHTML={{ __html: variant.overlay }} />
      </svg>
      </div>
      </div>
    </div>
  );
}

export const MockupLayerViewMemo = memo(MockupLayerView);
