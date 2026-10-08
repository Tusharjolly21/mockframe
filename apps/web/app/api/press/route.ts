import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { PRESS_SLUG_RE, slugifyAppName } from "@/lib/launchkit/types";

export const runtime = "nodejs";

const MAX_BODY = 500_000;
const PUBLISHES_PER_DAY = 10;

/**
 * POST /api/press — publish (or update) a hosted press page.
 * Sign-in required; slug is claimed by the first owner and only they can
 * update it. Screenshots/icon must already be hosted asset URLs.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Press page is too large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const appName = typeof body.appName === "string" ? body.appName.trim().slice(0, 60) : "";
  if (appName.length < 2) return NextResponse.json({ error: "App name required" }, { status: 400 });
  const requested = typeof body.slug === "string" ? body.slug : slugifyAppName(appName);
  if (!PRESS_SLUG_RE.test(requested)) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  // links and the contact end up in href / mailto: on a public page, so keep them to plain https URLs and one email address
  const invalid: string[] = [];
  const httpsLink = (v: unknown, label: string) => {
    let raw = str(v, 300);
    if (!raw) return "";
    // "yourapp.com" is what people type; give it a scheme instead of dropping it
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
    try {
      const url = new URL(raw);
      if (url.protocol === "https:") return raw;
      if (url.protocol === "http:") return `https://${raw.slice("http://".length)}`;
    } catch {
      /* falls through */
    }
    invalid.push(label);
    return "";
  };
  const email = (v: unknown) => {
    const raw = str(v, 120);
    if (!raw) return "";
    if (/^[^\s@<>?&=,;:"'()\[\]\\]+@[^\s@<>?&=,;:"'()\[\]\\]+\.[^\s@<>?&=,;:"'()\[\]\\]+$/.test(raw)) return raw;
    invalid.push("press contact");
    return "";
  };
  const hostedUrl = (v: unknown) => (typeof v === "string" && v.startsWith("https://") && v.length < 2048 ? v : null);
  const shots = (Array.isArray(body.screenshots) ? body.screenshots : [])
    .map((s) => (typeof s === "object" && s !== null ? hostedUrl((s as Record<string, unknown>).url) : null))
    .filter((u): u is string => Boolean(u))
    .slice(0, 8);

  const doc = {
    appName,
    tagline: str(body.tagline, 90),
    boilerplate: str(body.boilerplate, 500),
    category: str(body.category, 40),
    accent: /^#[0-9a-fA-F]{6}$/.test(String(body.accent)) ? String(body.accent) : "#7c3aed",
    icon: hostedUrl(body.icon),
    screenshots: shots,
    links: {
      site: httpsLink((body.links as Record<string, unknown> | undefined)?.site, "website link"),
      appstore: httpsLink((body.links as Record<string, unknown> | undefined)?.appstore, "App Store link"),
      play: httpsLink((body.links as Record<string, unknown> | undefined)?.play, "Google Play link"),
    },
    contact: email(body.contact),
  };
  if (invalid.length) {
    return NextResponse.json({ error: `Check the ${invalid.join(", ")}: use a full web address and a plain email address.` }, { status: 400 });
  }

  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return NextResponse.json({ error: "Sign in to publish a press page" }, { status: 401 });
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "press-publish", PUBLISHES_PER_DAY);
    if (!quota.allowed) return NextResponse.json({ error: "Daily publish limit reached" }, { status: 429 });

    const db = firestoreDb();
    const result = await db.runTransaction(async (txn) => {
      // find a slug this owner can claim: exact, else -2..-9 suffixes
      const candidates = [requested, ...Array.from({ length: 8 }, (_, i) => `${requested}-${i + 2}`)];
      for (const slug of candidates) {
        const ref = db.collection("pressPages").doc(slug);
        const snap = await txn.get(ref);
        const existingOwner = snap.exists ? (snap.data()?.ownerId as string | undefined) : undefined;
        if (!snap.exists || existingOwner === owner.ownerId) {
          txn.set(ref, { ...doc, ownerId: owner.ownerId, publishedAt: Date.now() }, { merge: false });
          return slug;
        }
      }
      return null;
    });
    if (!result) return NextResponse.json({ error: "That name is taken — try a different slug" }, { status: 409 });
    return attachOwnerCookie(NextResponse.json({ slug: result, url: `/press/${result}` }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "Firebase is not configured" }, { status: 501 });
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
