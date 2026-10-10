import { registerRoot, staticFile } from "remotion";
import { RemotionRoot } from "./Root";

// Entry point for the promo Remotion bundle (Lambda site + local renderer).
//
// Device art is referenced by root-absolute URLs (/devices/…), which only exist
// on the Next.js app. Inside this bundle the public folder is served under a
// prefix (/public locally, the S3 site URL on Lambda), so point the renderer at
// it — otherwise every photographic device body 404s and renders as a bare frame.
(globalThis as { __FK_ASSET_BASE__?: string }).__FK_ASSET_BASE__ = staticFile("x").replace(/\/x$/, "");

registerRoot(RemotionRoot);
