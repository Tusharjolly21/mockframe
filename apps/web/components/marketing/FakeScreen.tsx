"use client";

import { useEffect, useState } from "react";
import { defaultScreenDoc, encodeScreenAsset, resolveScreenAsset, type ScreenApp } from "@/lib/screens";

/**
 * Renders one of the app's built-in fake app screens (WhatsApp, Instagram, …)
 * as a crisp inline SVG image — the same generator the editor's screen studio
 * uses. Client-only (the generator lives in a client module), so it fades in
 * after hydration.
 */
export function FakeScreen({ app, className }: { app: ScreenApp; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const asset = resolveScreenAsset(encodeScreenAsset(defaultScreenDoc(app)));
    if (asset) setSrc(asset.url);
  }, [app]);
  if (!src) return <div className={className} style={{ aspectRatio: "393/852" }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${app} screenshot`} className={className} />;
}
