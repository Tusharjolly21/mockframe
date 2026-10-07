import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { migrateScene, SceneDocumentSchema, type SceneDocument } from "@framekit/scene";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { MAX_TEAM_TEMPLATES, TEAM_TEMPLATE_ID_RE, canEdit, isAccount, teamAccess } from "@/lib/server/teams";
import { forbidden, notFound, signInRequired, teamError } from "../../_shared";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const MAX_DOC_BODY = 950_000; // Firestore document limit is 1 MiB
const MAX_ASSETS = 40;

/** GET: the team's shared templates, newest first (any member). */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    const snap = await access.ref.collection("templates").orderBy("createdAt", "desc").limit(MAX_TEAM_TEMPLATES).get();
    const templates = snap.docs.flatMap((doc) => {
      const d = doc.data();
      try {
        return [
          {
            id: doc.id,
            name: typeof d.name === "string" ? d.name : "Template",
            scene: JSON.parse(d.sceneJson),
            assets: JSON.parse(d.assetsJson ?? "[]"),
            createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
            addedBy: typeof d.addedByEmail === "string" ? d.addedByEmail : null,
          },
        ];
      } catch {
        return []; // never let one damaged document break the whole library
      }
    });
    return NextResponse.json(templates);
  } catch (err) {
    return teamError(err, "templates GET");
  }
}

/** POST { id, name, scene, assets, createdAt }: add or update a shared template (owner / editor). */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    if (!canEdit(access.role)) return forbidden("Viewers can use the team's templates but not add them.");
    const raw = await req.text();
    if (raw.length > MAX_DOC_BODY) {
      return NextResponse.json({ error: "Template too large to share — remove big background images" }, { status: 413 });
    }
    const tpl = JSON.parse(raw) as { id?: unknown; name?: unknown; scene?: unknown; assets?: unknown; createdAt?: unknown };
    if (typeof tpl.id !== "string" || !TEAM_TEMPLATE_ID_RE.test(tpl.id) || typeof tpl.name !== "string" || !tpl.name.trim()) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    // teammates open this in their editors: it must be a valid scene
    let scene: SceneDocument | null = null;
    try {
      const parsed = SceneDocumentSchema.safeParse(migrateScene(tpl.scene));
      if (parsed.success) scene = parsed.data;
    } catch {
      /* unknown schema version / not a scene */
    }
    if (!scene) return NextResponse.json({ error: "Invalid template scene" }, { status: 400 });
    const assets = Array.isArray(tpl.assets) ? tpl.assets : [];
    if (
      assets.length > MAX_ASSETS ||
      !assets.every((a) => a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string" && typeof (a as { url?: unknown }).url === "string")
    ) {
      return NextResponse.json({ error: "Invalid template assets" }, { status: 400 });
    }
    const col = access.ref.collection("templates");
    const exists = (await col.doc(tpl.id).get()).exists;
    if (!exists && (await col.count().get()).data().count >= MAX_TEAM_TEMPLATES) {
      return NextResponse.json({ error: `The team library holds up to ${MAX_TEAM_TEMPLATES} templates — delete one first` }, { status: 409 });
    }
    await col.doc(tpl.id).set({
      name: tpl.name.trim().slice(0, 60),
      // JSON strings dodge Firestore's nested-array limits (quads, gradients…)
      sceneJson: JSON.stringify(scene),
      assetsJson: JSON.stringify(assets),
      createdAt: typeof tpl.createdAt === "number" ? tpl.createdAt : Date.now(),
      addedByUid: owner.uid,
      addedByEmail: owner.email?.toLowerCase() ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true }, { status: exists ? 200 : 201 });
  } catch (err) {
    return teamError(err, "templates POST");
  }
}
