import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { assertPublicUrl } from "@/lib/server/ssrf";
import { extractSiteCopy } from "@/lib/ai/extract";
import { ImportFetchError, resolveRedirectTarget } from "@/lib/ai/importRedirect";

export const runtime = "nodejs";
export const maxDuration = 30;

const AiImportBodySchema = z.object({
  url: z.string().url().max(2048),
});

const MAX_BODY_BYTES = 1_000_000;
const MAX_REDIRECT_HOPS = 3;

/**
 * Fetches `startUrl` with a manual redirect loop, re-validating every hop
 * (including the initial URL) against the SSRF guard before it is fetched.
 * This blocks DNS-rebinding-via-redirect: a same-origin-looking redirect
 * chain that resolves its final hop to an internal address is caught at
 * that hop, not just the first one.
 *
 * Known residual (matches the capture route's posture): there is a TOCTOU
 * gap between assertPublicUrl's DNS lookup and fetch's own resolution of the
 * same hostname. Acceptable — not solved here.
 */
async function fetchWithGuardedRedirects(startUrl: URL): Promise<{ response: Response; finalUrl: URL }> {
  let current = startUrl;
  let redirects = 0;

  while (true) {
    try {
      await assertPublicUrl(current);
    } catch {
      throw new ImportFetchError("blocked");
    }

    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "text/html",
        "user-agent": "MockFrameBot/1.0 (+https://mockframe.app)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      redirects++;
      if (redirects > MAX_REDIRECT_HOPS) throw new ImportFetchError("too-many-redirects");
      current = resolveRedirectTarget(response.headers.get("location"), current);
      continue;
    }

    return { response, finalUrl: current };
  }
}

async function readBodyCapped(response: Response): Promise<string> {
  const body = response.body;
  if (!body) throw new ImportFetchError("no-body");

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) break;
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  const combined = new Uint8Array(Math.min(total, MAX_BODY_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= combined.length) break;
    const slice = chunk.subarray(0, combined.length - offset);
    combined.set(slice, offset);
    offset += slice.length;
  }
  return new TextDecoder().decode(combined);
}

export async function POST(req: NextRequest) {
  const parsedBody = AiImportBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(parsedBody.data.url);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const owner = await getRequestOwner(req);
    const signedIn = !!owner.uid && owner.signInProvider !== "anonymous";
    if (!signedIn) return NextResponse.json({ error: "Sign in to import from a URL", reason: "signin" }, { status: 401 });

    const quota = await consumeDailyQuota(quotaSubject(req, owner), "ai-import", 30);
    if (!quota.allowed) return NextResponse.json({ error: "Daily import limit reached — try again tomorrow" }, { status: 429 });

    let response: Response;
    let finalUrl: URL;
    try {
      ({ response, finalUrl } = await fetchWithGuardedRedirects(url));
    } catch (err) {
      if (err instanceof ImportFetchError && err.message === "blocked") {
        return NextResponse.json({ error: "This URL isn't allowed" }, { status: 400 });
      }
      throw err;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "That page isn't a web page we can read" }, { status: 502 });
    }

    const html = await readBodyCapped(response);
    const { appName, description } = extractSiteCopy(html, finalUrl.toString());

    if (description.trim().length < 10) {
      return NextResponse.json({ error: "We couldn't find readable text on that page — add details manually" }, { status: 422 });
    }

    return attachOwnerCookie(NextResponse.json({ appName, description }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Import requires an account backend" }, { status: 501 });
    }
    if (err instanceof ImportFetchError || err instanceof DOMException || err instanceof TypeError) {
      return NextResponse.json({ error: "Couldn't read that page — check the URL or paste details manually" }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
