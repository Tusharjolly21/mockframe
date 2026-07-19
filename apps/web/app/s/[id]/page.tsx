import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import { BrandMark } from "@/components/marketing/BrandMark";
import { SharedSceneView } from "@/components/share/SharedSceneView";
import { firestoreDb } from "@/lib/server/firebaseAdmin";

export const runtime = "nodejs";

// user-generated share pages: reachable by link, kept out of the index
export const metadata: Metadata = {
  title: "Shared mockup",
  robots: { index: false, follow: true },
};

async function loadShare(id: string) {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  try {
    const doc = await firestoreDb().collection("sharedScenes").doc(id).get();
    if (!doc.exists) return null;
    return doc.data()!;
  } catch {
    return null;
  }
}

export default async function SharedScenePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadShare(id);
  if (!data) notFound();

  return (
    <main className="flex min-h-dvh flex-col bg-[#09090b] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size={26} />
          <span className="text-[14.5px] font-semibold">MockFrame</span>
        </Link>
        <Link
          href={`/editor?remix=${id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          <Pencil size={14} /> Remix this mockup
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="h-[min(76vh,900px)] w-full max-w-5xl">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <SharedSceneView scene={data.scene as any} assets={(data.assets ?? []) as any} />
        </div>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-center">
        <p className="text-[15px] font-medium">{String(data.name ?? "Shared mockup")}</p>
        <p className="text-[12.5px] text-zinc-500">
          Made with MockFrame — free device mockups, chat screens & promo videos.
        </p>
        <Link href="/editor" className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet-300 hover:text-violet-200">
          Make your own <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
