"use client";

/**
 * Encode a rendered image so it fits a byte budget (upload and response
 * limits): PNG when it fits, else JPEG on white, else JPEG at a smaller size.
 * `scale` is how much the result was shrunk from the source (1 when it wasn't).
 */
export async function fitImage(source: HTMLCanvasElement | ImageBitmap, maxBytes: number): Promise<{ blob: Blob; width: number; height: number; scale: number }> {
  const encode = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image"))), type, quality));

  const draw = (k: number, white: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * k));
    canvas.height = Math.max(1, Math.round(source.height * k));
    const ctx = canvas.getContext("2d")!;
    if (white) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const full = source instanceof HTMLCanvasElement ? source : draw(1, false);
  const png = await encode(full, "image/png");
  if (png.size <= maxBytes) return { blob: png, width: full.width, height: full.height, scale: 1 };
  for (let k = 1; k >= 0.25; k /= 1.5) {
    const canvas = draw(k, true);
    const jpeg = await encode(canvas, "image/jpeg", 0.92);
    if (jpeg.size <= maxBytes || k / 1.5 < 0.25) return { blob: jpeg, width: canvas.width, height: canvas.height, scale: canvas.width / source.width };
  }
  throw new Error("The image is too big to send");
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
