import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import type { PromoInputProps } from "./inputProps";

/**
 * Server-side promo render with two paths:
 *  - **Lambda** (production): if the REMOTION_LAMBDA_* env is set, render on
 *    Remotion Lambda and return the S3 URL of the MP4.
 *  - **Local** (dev / self-hosted Node): otherwise bundle the promo Remotion
 *    entry and render with @remotion/renderer to a temp MP4, returned as bytes.
 *
 * Vercel's serverless runtime can't run headless Chromium (libnss3 missing), so
 * production MUST use Lambda; the local path exists so the feature is fully
 * testable in `npm run dev` without any AWS setup.
 */

export type PromoRenderResult = { kind: "buffer"; data: Buffer } | { kind: "url"; url: string };

export function lambdaConfigured(): boolean {
  return Boolean(
    process.env.REMOTION_LAMBDA_FUNCTION_NAME &&
      process.env.REMOTION_LAMBDA_SITE_NAME &&
      process.env.REMOTION_AWS_ACCESS_KEY_ID &&
      process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
  );
}

const REGION = process.env.REMOTION_AWS_REGION || "us-east-1";

export async function renderPromo(args: {
  templateId: string;
  inputProps: PromoInputProps;
}): Promise<PromoRenderResult> {
  if (lambdaConfigured()) {
    return { kind: "url", url: await renderOnLambda(args) };
  }
  return { kind: "buffer", data: await renderLocally(args) };
}

/** Start a Lambda render and return immediately — the client polls progress.
 *  This keeps the HTTP route fast instead of holding a connection for the
 *  whole render (~1-3 min). */
export async function startPromoRenderOnLambda({ templateId, inputProps }: { templateId: string; inputProps: PromoInputProps }): Promise<{ renderId: string; bucketName: string }> {
  const { renderMediaOnLambda } = await import("@remotion/lambda/client");
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
  const serveUrl = process.env.REMOTION_LAMBDA_SITE_NAME!;
  const region = REGION as Parameters<typeof renderMediaOnLambda>[0]["region"];
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: templateId,
    inputProps,
    codec: "h264",
    imageFormat: "jpeg",
    privacy: "public",
    downloadBehavior: { type: "download", fileName: "mockframe-promo.mp4" },
    framesPerLambda: Number(process.env.REMOTION_FRAMES_PER_LAMBDA) || 40,
  });
  return { renderId, bucketName };
}

export async function getPromoRenderProgress(renderId: string, bucketName: string): Promise<{ done: boolean; progress: number; outputFile: string | null; error: string | null }> {
  const { getRenderProgress } = await import("@remotion/lambda/client");
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
  const region = REGION as Parameters<typeof getRenderProgress>[0]["region"];
  const p = await getRenderProgress({ renderId, bucketName, functionName, region });
  return {
    done: p.done,
    progress: p.overallProgress ?? 0,
    outputFile: p.outputFile ?? null,
    error: p.fatalErrorEncountered ? (p.errors?.[0]?.message ?? "Lambda render failed") : null,
  };
}

async function renderOnLambda({ templateId, inputProps }: { templateId: string; inputProps: PromoInputProps }): Promise<string> {
  const { renderMediaOnLambda, getRenderProgress } = await import("@remotion/lambda/client");
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
  const serveUrl = process.env.REMOTION_LAMBDA_SITE_NAME!;
  const region = REGION as Parameters<typeof renderMediaOnLambda>[0]["region"];

  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: templateId,
    inputProps,
    codec: "h264",
    imageFormat: "jpeg",
    privacy: "public",
    downloadBehavior: { type: "download", fileName: "mockframe-promo.mp4" },
    // How many frames each Lambda renders. Lower = more parallel lambdas =
    // faster, but needs account concurrency headroom. New AWS accounts start
    // with a tiny concurrency quota — raise it in Service Quotas, then tune
    // this down (e.g. 20) for ~15-way parallel renders.
    framesPerLambda: Number(process.env.REMOTION_FRAMES_PER_LAMBDA) || 40,
  });

  // Poll until done. A ~10s promo finishes well within the default timeout.
  for (;;) {
    const progress = await getRenderProgress({ renderId, bucketName, functionName, region });
    if (progress.fatalErrorEncountered) {
      throw new Error(progress.errors?.[0]?.message ?? "Lambda render failed");
    }
    if (progress.done) {
      if (!progress.outputFile) throw new Error("Lambda render finished without an output file");
      return progress.outputFile;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

// Bundle once per server process and reuse across renders.
let bundlePromise: Promise<string> | null = null;
async function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const { bundle } = await import("@remotion/bundler");
      const entry = path.join(process.cwd(), "remotion", "promo", "index.ts");
      return bundle({ entryPoint: entry });
    })();
  }
  return bundlePromise;
}

async function renderLocally({ templateId, inputProps }: { templateId: string; inputProps: PromoInputProps }): Promise<Buffer> {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await getServeUrl();
  const composition = await selectComposition({ serveUrl, id: templateId, inputProps });
  const outPath = path.join(os.tmpdir(), `promo-${templateId}-${Date.now()}.mp4`);
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: outPath, inputProps });
  const data = await fs.readFile(outPath);
  await fs.unlink(outPath).catch(() => {});
  return data;
}
