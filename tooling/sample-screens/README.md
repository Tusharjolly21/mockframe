# Store-set sample screens

The fictional app screens the store listing sets (`apps/web/lib/storeSets.ts`)
show inside their phones. Each `<app>/NN.html` is one screen, written once and
rendered for both platforms (iOS 402 × 874 @3x, Android 412 × 920 @3.1x).

```bash
npm i --no-save playwright-core          # once
CHROMIUM_PATH=/path/to/chromium node tooling/sample-screens/render.mjs [app] [NN]
python3 tooling/sample-screens/towebp.py [app]
```

Floating cards in `storeSets.ts` crop regions of these screens in iOS px, so
keep the cropped blocks where the comments in each page say they are.
Hush and Stride 01–05 were rendered before this tooling existed; only their
WebP output is in the repo.
