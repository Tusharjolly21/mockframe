import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { migrateScene, SceneDocumentSchema } from "@framekit/scene";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";

export const runtime = "nodejs";

const MAX_BODY = 950_000; // Firestore doc limit is 1 MiB
const MAX_ASSETS = 40;
const SHARES_PER_DAY = 30;

/**
 * POST /api/scene-share { scene, assets[], name? } → { id }
 *
 * Publishes a REMIXABLE scene: the full scene JSON plus the hosted URLs of
 * every uploaded asset it references. Free (viral loop by design) — guarded by
 * a daily quota per caller. Assets must already be hosted (persistAsset), so
 * this endpoint stores only JSON.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "Scene is too large to share" }, { status: 413 });
  }
  let body: { scene?: unknown; assets?: unknown; name?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SceneDocumentSchema.safeParse(migrateScene(body.scene));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scene" }, { status: 400 });
  }

  const rawAssets = Array.isArray(body.assets) ? body.assets : [];
  if (rawAssets.length > MAX_ASSETS) {
    return NextResponse.json({ error: `Too many assets (max ${MAX_ASSETS})` }, { status: 400 });
  }
  const assets: { id: string; name: string; url: string; width: number; height: number }[] = [];
  for (const a of rawAssets) {
    if (typeof a !== "object" || a === null) continue;
    const { id, name, url, width, height } = a as Record<string, unknown>;
    if (typeof id !== "string" || typeof url !== "string") continue;
    // only hosted https URLs get stored — object/blob/data URLs would be dead
    // (or enormous) in a share doc
    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "All assets must be uploaded before sharing" }, { status: 400 });
    }
    assets.push({
      id: id.slice(0, 120),
      name: typeof name === "string" ? name.slice(0, 140) : "asset",
      url: url.slice(0, 2048),
      width: Number(width) || 0,
      height: Number(height) || 0,
    });
  }

  try {
    const owner = await getRequestOwner(req);
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "scene-share", SHARES_PER_DAY);
    if (!quota.allowed) {
      return NextResponse.json({ error: `Daily share limit reached (${quota.limit})` }, { status: 429 });
    }
    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    await firestoreDb()
      .collection("sharedScenes")
      .doc(id)
      .set({
        scene: parsed.data,
        assets,
        name: typeof body.name === "string" ? body.name.slice(0, 120) : "Shared mockup",
        ownerId: owner.ownerId,
        createdAtMs: Date.now(),
      });
    return attachOwnerCookie(NextResponse.json({ id }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    return NextResponse.json({ error: "Share failed" }, { status: 500 });
  }
}
