"use client";

import { DeviceShot } from "@/components/DeviceShot";
import { KIT_SURFACES, type KitSurfaceId, type LaunchKitDoc } from "@/lib/launchkit/types";

/** #rrggbb → rgba() */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - t));
  return `#${(((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)) >>> 0).toString(16).padStart(6, "0")}`;
}

const FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

/** Shared premium backdrop: deep accent gradient + mesh glows + fine grid. */
function Backdrop({ accent, W, H }: { accent: string; W: number; H: number }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${shade(accent, 0.82)} 0%, #0a0a10 55%, ${shade(accent, 0.88)} 100%)` }} />
      <div style={{ position: "absolute", left: -W * 0.15, top: -H * 0.3, width: W * 0.7, height: W * 0.7, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(accent, 0.4)} 0%, transparent 65%)`, filter: "blur(10px)" }} />
      <div style={{ position: "absolute", right: -W * 0.1, bottom: -H * 0.35, width: W * 0.55, height: W * 0.55, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(accent, 0.25)} 0%, transparent 65%)`, filter: "blur(10px)" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${rgba("#ffffff", 0.04)} 1px, transparent 1px), linear-gradient(90deg, ${rgba("#ffffff", 0.04)} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(80% 80% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(80% 80% at 50% 40%, black 30%, transparent 100%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 100% at 50% 45%, transparent 45%, rgba(0,0,0,0.5) 100%)` }} />
    </>
  );
}

function IconChip({ doc, size }: { doc: LaunchKitDoc; size: number }) {
  return doc.iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={doc.iconUrl} alt="" style={{ width: size, height: size, borderRadius: size * 0.24, objectFit: "cover", boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1)` }} />
  ) : (
    <span style={{ display: "grid", placeItems: "center", width: size, height: size, borderRadius: size * 0.24, background: doc.accent, color: "#fff", fontFamily: FONT, fontWeight: 800, fontSize: size * 0.5 }}>
      {doc.appName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Phone({ doc, width }: { doc: LaunchKitDoc; width: number }) {
  const shot = doc.screenshots[0];
  if (!shot) return null;
  return <DeviceShot deviceId="iphone-16-pro" src={shot.url} imgW={shot.width} imgH={shot.height} width={width} />;
}

/**
 * One launch surface at TRUE pixel size — render inside a scale-wrapper for
 * previews and 1:1 offscreen for export. Six premium accent-driven layouts.
 */
export function KitSurface({ id, doc }: { id: KitSurfaceId; doc: LaunchKitDoc }) {
  const surface = KIT_SURFACES.find((s) => s.id === id)!;
  const { width: W, height: H } = surface;
  const accent = doc.accent;
  const site = doc.links.site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const base: React.CSSProperties = { position: "relative", width: W, height: H, overflow: "hidden", fontFamily: FONT, color: "#fff" };

  if (id === "ph-thumb") {
    // 240×240 — icon-forward; PH masks its own corners
    return (
      <div style={{ ...base, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${accent}, ${shade(accent, 0.55)})` }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 90% at 20% 10%, ${rgba("#ffffff", 0.25)} 0%, transparent 55%)` }} />
        <IconChip doc={doc} size={150} />
      </div>
    );
  }

  if (id === "story") {
    // 1080×1920 — stacked vertical
    return (
      <div style={base}>
        <Backdrop accent={accent} W={W} H={H} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 150 }}>
          <IconChip doc={doc} size={132} />
          <p style={{ margin: "44px 0 0", fontWeight: 800, fontSize: 76, letterSpacing: -2, textAlign: "center", maxWidth: W * 0.85, lineHeight: 1.05 }}>{doc.appName}</p>
          <p style={{ margin: "26px 0 0", fontWeight: 500, fontSize: 38, color: "rgba(255,255,255,0.72)", textAlign: "center", maxWidth: W * 0.8, lineHeight: 1.35 }}>{doc.copy.tagline}</p>
          <div style={{ marginTop: 70, filter: `drop-shadow(0 60px 120px ${rgba(accent, 0.45)})` }}>
            <Phone doc={doc} width={560} />
          </div>
        </div>
        {site && (
          <p style={{ position: "absolute", bottom: 56, left: 0, right: 0, textAlign: "center", fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: 0 }}>{site}</p>
        )}
      </div>
    );
  }

  // landscape family: og / x / ph-gallery / github — text left, device right
  const scale = W / 1200; // proportional type across the landscape sizes
  const isGithub = id === "github";
  return (
    <div style={base}>
      <Backdrop accent={accent} W={W} H={H} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: `0 ${72 * scale}px` }}>
        <div style={{ flex: 1.15, paddingRight: 40 * scale }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 * scale }}>
            <IconChip doc={doc} size={84 * scale} />
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 58 * scale, letterSpacing: -1.5 * scale, lineHeight: 1.05 }}>{doc.appName}</p>
              {doc.category && <p style={{ margin: `${6 * scale}px 0 0`, fontSize: 20 * scale, fontWeight: 600, letterSpacing: 2 * scale, textTransform: "uppercase", color: rgba(accent, 0.95) }}>{doc.category}</p>}
            </div>
          </div>
          <p style={{ margin: `${34 * scale}px 0 0`, fontWeight: 600, fontSize: 34 * scale, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", maxWidth: 560 * scale }}>{doc.copy.tagline}</p>
          {isGithub ? (
            <div style={{ marginTop: 36 * scale, display: "inline-flex", alignItems: "center", gap: 10 * scale, borderRadius: 12 * scale, border: `1px solid ${rgba("#ffffff", 0.18)}`, background: rgba("#ffffff", 0.06), padding: `${12 * scale}px ${22 * scale}px`, fontSize: 20 * scale, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
              {site || "README.md"}
            </div>
          ) : (
            site && (
              <div style={{ marginTop: 36 * scale, display: "inline-flex", borderRadius: 999, background: rgba(accent, 0.9), padding: `${12 * scale}px ${26 * scale}px`, fontSize: 21 * scale, fontWeight: 700, color: "#0a0a10" }}>
                {site}
              </div>
            )
          )}
        </div>
        <div style={{ flex: 0.85, display: "flex", justifyContent: "center", transform: `rotate(${id === "ph-gallery" ? -4 : -6}deg) translateY(${H * 0.12}px)`, filter: `drop-shadow(0 ${40 * scale}px ${90 * scale}px ${rgba(accent, 0.4)})` }}>
          <Phone doc={doc} width={Math.min(340 * scale, H * 0.62)} />
        </div>
      </div>
    </div>
  );
}
