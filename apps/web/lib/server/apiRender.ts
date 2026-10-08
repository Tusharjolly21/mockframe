import { createHash, randomUUID } from "node:crypto";
import { API_RESULT_TTL_MS, isDataUrl, isUploadRef, type RenderJob, type RenderedImage } from "../apiRender";
import { launchBrowser } from "./browser";
import { assertPublicUrl, fetchPublicBytes } from "./ssrf";
import { tempRead, tempSave, tempSignedUrl } from "./tempStore";

/** one screenshot, fetched or uploaded */
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export interface StoredImage {
  name: string;
  width: number;
  height: number;
  url: string;
}

export class ApiInputError extends Error {}

const uploadPath = (uid: string, id: string) => `api-uploads/${uid}/${id}`;

/** Keep a screenshot for a later render request (POST /api/v1/uploads). */
export async function saveUpload(uid: string, data: Buffer, contentType: string): Promise<string> {
  const id = `upload_${randomUUID()}`;
  await tempSave(uploadPath(uid, id), data, contentType);
  return id;
}

async function fetchImage(url: string): Promise<string> {
  const target = new URL(url);
  await assertPublicUrl(target).catch(() => {
    throw new ApiInputError(`${target.hostname} can't be fetched. Use a public https URL or upload the file.`);
  });
  const res = await fetchPublicBytes(target, { maxBytes: MAX_SCREENSHOT_BYTES, accept: "image/png,image/jpeg,image/webp" }).catch(() => null);
  if (!res || res.status < 200 || res.status > 299) throw new ApiInputError(`Couldn't download ${url} (${res?.status ?? "no response"}).`);
  const type = res.contentType;
  if (!/^image\/(png|jpeg|webp)$/.test(type)) throw new ApiInputError(`${url} isn't a PNG, JPEG or WebP image.`);
  if (res.tooLarge) throw new ApiInputError(`${url} is over 10 MB.`);
  const data = res.data;
  return `data:${type};base64,${data.toString("base64")}`;
}

/** Every screenshot as a data URL the render page can load without network access. */
export async function resolveScreenshots(refs: string[], uid: string): Promise<string[]> {
  return Promise.all(
    refs.map(async (ref) => {
      if (isDataUrl(ref)) return ref;
      if (isUploadRef(ref)) {
        const hit = await tempRead(uploadPath(uid, ref));
        if (!hit) throw new ApiInputError(`${ref} wasn't found. Uploads last 24 hours.`);
        return `data:${hit.contentType};base64,${hit.data.toString("base64")}`;
      }
      return fetchImage(ref);
    })
  );
}

/** Open /render in headless Chromium and build the job there. */
export async function runRenderJob(job: RenderJob, origin: string): Promise<RenderedImage[]> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(90_000);
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
    const url = new URL("/render", process.env.MOCKFRAME_RENDER_ORIGIN || origin);
    // everything the render needs is on our origin or inline; this keeps
    // analytics from counting API renders as visits
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith("data:") || u.startsWith("blob:") || new URL(u).origin === url.origin) void r.continue();
      else void r.abort();
    });
    await page.goto(url.toString(), { waitUntil: "load" });
    await page.waitForFunction(() => window.__mockframeReady === true);
    return await page.evaluate((j) => window.__mockframeRender!(j), job);
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Store the renders for a day and return links to them. */
export async function storeRenders(images: RenderedImage[], uid: string, origin: string): Promise<StoredImage[]> {
  const batch = randomUUID();
  // links carry the path, so keep the account id out of it
  const owner = createHash("sha256").update(uid).digest("hex").slice(0, 20);
  return Promise.all(
    images.map(async (img) => {
      const [, type, b64] = img.dataUrl.match(/^data:([^;]+);base64,(.*)$/) ?? [];
      if (!b64) throw new Error("Render returned no image");
      const path = `api-renders/${owner}/${batch}/${img.name}`;
      await tempSave(path, Buffer.from(b64, "base64"), type);
      // without Firebase (local dev) the files route serves them
      const url = (await tempSignedUrl(path, API_RESULT_TTL_MS)) ?? new URL(`/api/v1/files/${path}`, origin).toString();
      return { name: img.name, width: img.width, height: img.height, url };
    })
  );
}

/** Resolve, render and store one job for an API caller. */
export async function renderForCaller(job: RenderJob, uid: string, origin: string): Promise<StoredImage[]> {
  const screenshots = await resolveScreenshots(job.screenshots, uid);
  const images = await runRenderJob({ ...job, screenshots }, origin);
  if (!images.length) throw new ApiInputError("Nothing could be rendered from those screenshots.");
  return storeRenders(images, uid, origin);
}

/* ---------------------------- upload links (MCP) ---------------------------- */

const LINK_TTL_MS = 30 * 60 * 1000;

/**
 * A link an agent can POST a file to without holding the API key (the key
 * lives in the MCP client's config): curl --data-binary @shot.png <link>.
 */
export async function createUploadLink(uid: string, origin: string): Promise<string> {
  const token = randomUUID();
  await tempSave(`api-upload-links/${token}`, Buffer.from(JSON.stringify({ uid, at: Date.now() })), "application/json");
  return new URL(`/api/v1/uploads/${token}`, origin).toString();
}

/** The account an upload link belongs to, while it's valid. */
export async function uploadLinkOwner(token: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return null;
  const hit = await tempRead(`api-upload-links/${token}`).catch(() => null);
  if (!hit) return null;
  const { uid, at } = JSON.parse(hit.data.toString("utf8")) as { uid: string; at: number };
  return Date.now() - at <= LINK_TTL_MS ? uid : null;
}
