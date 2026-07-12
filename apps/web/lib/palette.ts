"use client";

/**
 * Auto-palette (§4 "Magic"): dominant colors from the uploaded screenshot,
 * offered as one-click backgrounds. Deterministic k-means over a downsampled
 * grid — fixed initial centroids, fixed iteration count, no randomness.
 */
export async function extractPalette(url: string, k = 5): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("palette: image failed to load"));
    i.src = url;
  });

  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const px: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (px.length === 0) return [];

  // fixed, evenly spaced initial centroids → deterministic result
  let centroids = Array.from({ length: k }, (_, i) => px[Math.floor((i * px.length) / k)]);

  for (let iter = 0; iter < 8; iter++) {
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d =
          (p[0] - centroids[c][0]) ** 2 + (p[1] - centroids[c][1]) ** 2 + (p[2] - centroids[c][2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3]++;
    }
    centroids = sums.map((s, i) =>
      s[3] > 0 ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centroids[i]
    ) as [number, number, number][];
  }

  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  // sort dark → light for pleasant gradient pairs
  return centroids
    .sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    .map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`);
}
