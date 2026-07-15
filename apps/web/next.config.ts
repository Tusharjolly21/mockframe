import type { NextConfig } from "next";

// The Firebase project that backs auth/firestore/storage. Its auth *handler*
// lives at https://<this>/__/auth/handler; the rewrites below re-serve it under
// our own domain, so once NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to mockframe.app
// the Google consent screen reads "continue to mockframe.app" instead of the
// firebaseapp.com default. Harmless while authDomain is still the default.
const FIREBASE_APP_DOMAIN = "mockframe-f59a3.firebaseapp.com";

const nextConfig: NextConfig = {
  // firebase-admin is on Next's default server-externals list, but Vercel's
  // function loader can't require() its ESM-only jose dependency (via
  // jwks-rsa) — every firebase-admin API route 500s at cold start. Listing it
  // here opts it back into webpack bundling, which compiles the ESM away.
  transpilePackages: ["@framekit/scene", "@framekit/devices", "@framekit/renderer", "firebase-admin"],
  // headless-chromium stack must stay unbundled — it ships platform binaries
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "@remotion/renderer", "@remotion/bundler"],
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `https://${FIREBASE_APP_DOMAIN}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${FIREBASE_APP_DOMAIN}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
