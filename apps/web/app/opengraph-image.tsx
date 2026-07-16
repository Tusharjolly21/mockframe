import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/**
 * Default social-share card, auto-applied by Next's file convention to every
 * page that doesn't set its own openGraph/twitter image. Fixes the blank link
 * previews the audit found across home/pricing/guides/templates/etc.
 */

export const alt = "MockFrame — turn screenshots into beautiful device mockups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          // Satori (the OG renderer) can't parse a bare hex inside the
          // `background` shorthand — solid color goes on backgroundColor,
          // gradients on backgroundImage.
          backgroundColor: "#0b0817",
          backgroundImage:
            "radial-gradient(1200px 600px at 20% 0%, rgba(124,58,237,0.55), transparent 60%), radial-gradient(1000px 600px at 100% 100%, rgba(34,211,238,0.4), transparent 55%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #8b5cf6, #d946ef, #22d3ee)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 900 }}>
            Turn any screenshot into a stunning mockup.
          </div>
          <div style={{ fontSize: 32, color: "#c7c3d6", maxWidth: 820 }}>
            Photoreal device frames, chat &amp; app screens, and social-ready exports — free, in your browser.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Device mockups", "App-store screenshots", "Chat screens", "4K export"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 24,
                color: "#e7e4f0",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "8px 20px",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
