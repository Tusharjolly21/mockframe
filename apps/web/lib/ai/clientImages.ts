"use client";

/**
 * Client-side prep for the AI real-screenshots mode: shrink an uploaded
 * screenshot to a canvas capped at MAX_LONG_EDGE on its long edge (never
 * upscaling) and re-encode as a JPEG data URL, keeping the POST body under
 * the route's per-image char cap without a server round-trip.
 */
const MAX_LONG_EDGE = 1300;
const JPEG_QUALITY = 0.8;

type LoadedImage = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

export async function downscaleForAi(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }

  const { source, width, height, cleanup } = await loadImage(file);
  try {
    if (width <= 0 || height <= 0) throw new Error("Not a decodable image");
    const longEdge = Math.max(width, height);
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser");
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    cleanup();
  }
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // fall through — some browsers can't decode certain formats (e.g. HEIC)
      // via createImageBitmap; retry through an <img> + object URL instead.
    }
  }
  return loadImageViaObjectUrl(file);
}

function loadImageViaObjectUrl(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not a decodable image"));
    };
    img.src = url;
  });
}
