import type { NextConfig } from "next";

// The Firebase project that backs auth/firestore/storage. Its auth *handler*
// lives at https://<this>/__/auth/handler; the rewrites below re-serve it under
// our own domain, so once NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to mockframe.app
// the Google consent screen reads "continue to mockframe.app" instead of the
// firebaseapp.com default. Harmless while authDomain is still the default.
const FIREBASE_APP_DOMAIN = "mockframe-f59a3.firebaseapp.com";

// Baseline response headers. A full script-src CSP is deliberately NOT here: the app depends on
// Firebase's auth popup, Google Analytics, the Dodo checkout overlay and inline bootstrap scripts,
// and a policy that is wrong for any of them breaks sign-in or payment for everyone. These cover
// clickjacking, MIME sniffing, plugin content and referrer leaks without touching any of those.
const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // the recorder needs the camera, microphone, screen capture and Picture-in-Picture; nothing else is used
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), picture-in-picture=(self), geolocation=(), usb=(), bluetooth=()" },
];

const nextConfig: NextConfig = {
  // firebase-admin is on Next's default server-externals list, but Vercel's
  // function loader can't require() its ESM-only jose dependency (via
  // jwks-rsa) — every firebase-admin API route 500s at cold start. Listing it
  // here opts it back into webpack bundling, which compiles the ESM away.
  transpilePackages: ["@framekit/scene", "@framekit/devices", "@framekit/renderer", "firebase-admin"],
  // headless-chromium stack must stay unbundled — it ships platform binaries
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "@remotion/renderer", "@remotion/bundler"],
  async headers() {
    return [
      { source: "/:path*", headers: BASE_HEADERS },
      // everywhere except the embeddable editor and Firebase's auth handler: only our own pages may frame us
      {
        source: "/((?!embed/|__/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /tools/app-store-screenshot duplicated /app-store-screenshots' target
      // keyword ("app store screenshot generator") and split ranking signal
      // across two URLs; the pack studio page is the canonical target.
      { source: "/tools/app-store-screenshot", destination: "/app-store-screenshots", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `https://${FIREBASE_APP_DOMAIN}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${FIREBASE_APP_DOMAIN}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
