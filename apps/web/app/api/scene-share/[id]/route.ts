import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";

export const runtime = "nodejs";

/** GET /api/scene-share/[id] — public read used by the editor's remix loader. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{6,32}$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const doc = await firestoreDb().collection("sharedScenes").doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = doc.data()!;
    return NextResponse.json(
      { scene: data.scene, assets: data.assets ?? [], name: data.name ?? "Shared mockup" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured" }, { status: 501 });
    }
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
