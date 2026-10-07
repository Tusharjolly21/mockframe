# Theme

## Part 1 — compact token summary
- **Stack:** Tailwind CSS v4 (CSS-first config via `@import "tailwindcss"` / `@theme` in globals.css; no tailwind.config.*), PostCSS.
- **Fonts:** Inter (UI), Inter Display / heavy Inter for headlines; mono for code. Headlines use tight tracking (-0.03em to -0.04em).
- **Marketing (dark):** page #09090b; cards #0e0f14 / #101116; borders rgba(255,255,255,.10) → hover .25; text white / zinc-400 (#a1a1aa) / zinc-500 (#71717a); accents cyan-300 (#67e8f9), indigo, fuchsia gradients (from-cyan-200 via-indigo-200 to-fuchsia-200) for highlighted headline words; violet-600 (#7c3aed) primary in Pack Studio.
- **Editor (light):** canvas #ebebf0-ish dotted; panels white with soft shadow (`fk-card`), ink #17171c, secondary #6b6b76 / #8a8a94, hairline #ececf2 / #e4e4ec, active pill black; brand gradient tile violet→fuchsia.
- **Radius:** marketing cards rounded-2xl (16px) / hero 28px; pills rounded-full; editor panels ~18–20px, controls 8–12px.
- **Shadows:** marketing cards none/hover lift; screenshots `0 30px 80px -20px rgba(0,0,0,.75)`; editor `fk-card` soft layered shadow.
- **Spacing:** 4px grid; marketing sections max-w-6xl/7xl, px-5/6, section gaps mt-16; editor panels 12–16px padding.
- **Breakpoints:** Tailwind defaults (sm 640, md 768, lg 1024, xl 1280).
- **Motion:** `Reveal` (fade/slide-in on scroll), hover -translate-y-0.5, image scale 1.03–1.04 on hover.

### CSS custom properties found in globals.css
- `--app-bg`: #e9e9f0
- `--card`: #fbfbfd
- `--card-border`: rgba(20, 20, 30, 0.07)
- `--ink`: #17171c
- `--ink-dim`: #8a8a94

## Part 2 — raw sources

### `apps/web/app/globals.css`

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --app-bg: #e9e9f0;
  --card: #fbfbfd;
  --card-border: rgba(20, 20, 30, 0.07);
  --ink: #17171c;
  --ink-dim: #8a8a94;
}

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  background: var(--app-bg);
  color: var(--ink);
  overscroll-behavior: none;
}

/* floating panel card */
.fk-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  box-shadow:
    0 1px 2px rgba(20, 20, 40, 0.04),
    0 8px 24px rgba(20, 20, 40, 0.06);
}

/* interactive tiles: smooth hover lift + press, shots.so-style */
.fk-tile {
  transition:
    transform 180ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 180ms cubic-bezier(0.2, 0, 0, 1),
    border-color 180ms ease,
    background-color 180ms ease;
  cursor: pointer;
}
.fk-tile:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(20, 20, 40, 0.1);
}
.fk-tile:active {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 2px 6px rgba(20, 20, 40, 0.08);
  transition-duration: 80ms;
}

.fk-press {
  transition: transform 140ms cubic-bezier(0.2, 0, 0, 1), background-color 160ms ease, color 160ms ease, opacity 160ms ease;
  cursor: pointer;
}
.fk-press:active {
  transform: scale(0.94);
  transition-duration: 70ms;
}

.fk-popover-focus :focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}

/* A new device should feel placed into the composition, not teleported onto it. */
@keyframes fk-device-enter {
  0% {
    opacity: 0;
    translate: 0 42px;
    scale: 0.82;
    rotate: -3deg;
    filter: blur(7px);
  }
  62% {
    opacity: 1;
    translate: 0 -5px;
    scale: 1.015;
    rotate: 0.4deg;
    filter: blur(0);
  }
  100% {
    opacity: 1;
    translate: 0 0;
    scale: 1;
    rotate: 0deg;
    filter: blur(0);
  }
}

/* range inputs */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 99px;
  background: #dcdce6;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid rgba(20, 20, 30, 0.12);
  box-shadow: 0 1px 4px rgba(20, 20, 40, 0.2);
  transition: transform 140ms ease;
}
input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(20, 20, 30, 0.12);
}

input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  border: none;
  padding: 0;
  background: none;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch {
  border: 1px solid rgba(20, 20, 30, 0.12);
  border-radius: 8px;
}

.panel-scroll {
  scrollbar-width: thin;
  scrollbar-color: #d0d0dc transparent;
}
.panel-scroll::-webkit-scrollbar {
  width: 6px;
}
.panel-scroll::-webkit-scrollbar-thumb {
  background: #d0d0dc;
  border-radius: 99px;
}

.checkerboard {
  background-image: conic-gradient(#d7d7e0 0 25%, #eeeef4 0 50%, #d7d7e0 0 75%, #eeeef4 0);
  background-size: 24px 24px;
}

@media (prefers-reduced-motion: reduce) {
  .fk-tile,
  .fk-press,
  input[type="range"]::-webkit-slider-thumb {
    transition: none !important;
  }
}

/* guided flow: "Next" breathes once the first screen lands */
@keyframes fk-nudge {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
  50% { box-shadow: 0 0 0 5px rgba(124, 58, 237, 0.22); }
}
.fk-nudge {
  animation: fk-nudge 1.8s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .fk-nudge { animation: none; }
}
```


### `apps/web/postcss.config.mjs`

```tsx
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

