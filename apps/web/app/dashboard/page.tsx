"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Frame, LayoutTemplate, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { BrandMark } from "@/components/marketing/BrandMark";
import { useAuth } from "@/lib/auth";
import {
  deleteDraft,
  listDrafts,
  openDraft,
  saveDraft,
  timeAgo,
  useDraftsUi,
  type DraftRecord,
} from "@/lib/drafts";
import { useSceneStore } from "@/lib/store";

export default function DashboardPage() {
  const router = useRouter();
  const { account } = useAuth();
  const setScene = useSceneStore((s) => s.setScene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const setCurrent = useDraftsUi((s) => s.setCurrent);

  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [section, setSection] = useState<"scene" | "template">("scene");

  const refresh = useCallback(() => {
    listDrafts().then(setDrafts, () => setDrafts([]));
  }, []);
  useEffect(refresh, [refresh]);

  function open(rec: DraftRecord) {
    setScene(() => openDraft(rec));
    setCurrent(rec.kind === "template" ? null : rec.id, rec.kind === "template" ? null : rec.name);
    router.push("/editor");
  }

  function newScene() {
    resetScene();
    setCurrent(null);
    router.push("/editor");
  }

  async function rename(rec: DraftRecord) {
    setMenuId(null);
    const name = window.prompt("Rename scene", rec.name)?.trim();
    if (!name || name === rec.name) return;
    await saveDraft({ scene: rec.scene, id: rec.id, name, kind: rec.kind, assets: rec.assets, thumbnail: rec.thumbnail });
    if (useDraftsUi.getState().currentId === rec.id) setCurrent(rec.id, name);
    refresh();
  }

  async function duplicate(rec: DraftRecord) {
    setMenuId(null);
    await saveDraft({ scene: rec.scene, name: `${rec.name} copy`, kind: rec.kind, assets: rec.assets, thumbnail: rec.thumbnail });
    refresh();
  }

  async function remove(rec: DraftRecord) {
    setMenuId(null);
    if (!window.confirm(`Delete “${rec.name}”? This can't be undone.`)) return;
    await deleteDraft(rec.id);
    setDrafts((d) => (d ? d.filter((x) => x.id !== rec.id) : d));
  }

  const visible = drafts?.filter((record) => record.kind === section) ?? null;

  return (
    <div className="min-h-screen bg-[#f4f4f7] text-[#17171c]">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-[#e6e6ee] bg-white px-5 py-3">
        <Link href="/editor" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-[15px] font-bold tracking-tight">MockFrame</span>
        </Link>
        <Link href="/templates" className="fk-press ml-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]">
          Templates
        </Link>
        <div className="ml-auto">
          <AccountButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Your work</h1>
            <p className="mt-0.5 text-[13px] text-[#8a8a94]">
              {account ? `Signed in as ${account.email ?? account.name}` : "Saved on this device — sign in to sync across devices."}
            </p>
          </div>
          <button
            onClick={newScene}
            className="fk-press flex items-center gap-1.5 rounded-xl bg-[#17171c] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black"
          >
            <Plus size={15} /> New scene
          </button>
        </div>

        <div className="mb-5 inline-flex rounded-xl border border-[#e1e1e8] bg-white p-1" role="tablist" aria-label="Your work">
          {(["scene", "template"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={section === value}
              onClick={() => setSection(value)}
              className={`fk-press rounded-lg px-4 py-2 text-[12.5px] font-semibold ${section === value ? "bg-[#17171c] text-white" : "text-[#6b6b76] hover:bg-black/[0.04]"}`}
            >
              {value === "scene" ? "Scenes" : "Personal templates"}
            </button>
          ))}
        </div>

        {visible === null ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-[#e8e8ef]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#d6d6e0] bg-white py-20 text-center">
            <p className="text-[15px] font-semibold text-[#17171c]">{section === "scene" ? "No saved scenes yet" : "No personal templates yet"}</p>
            <p className="mb-4 mt-1 text-[13px] text-[#8a8a94]">
              {section === "scene" ? "Create your first mockup and save it from the editor." : "Save a styled canvas as a template from the editor's folder menu."}
            </p>
            <button onClick={newScene} className="fk-press flex items-center gap-1.5 rounded-xl bg-[#17171c] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">
              <Plus size={15} /> New scene
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {visible.map((rec) => (
              <div key={rec.id} className="group relative overflow-hidden rounded-xl border border-[#e6e6ee] bg-white transition hover:border-[#c9c9d6] hover:shadow-md">
                <button onClick={() => open(rec)} className="block w-full text-left">
                  <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-[#eceef3]">
                    {rec.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.thumbnail} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Frame size={26} className="text-[#c2c2ce]" />
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-[#17171c]">
                      {rec.kind === "template" && <LayoutTemplate size={13} className="shrink-0 text-violet-600" />}{rec.name}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#9a9aa4]">{timeAgo(rec.updatedAt)}</p>
                  </div>
                </button>

                {/* actions */}
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(menuId === rec.id ? null : rec.id);
                    }}
                    className="fk-press grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-[#6b6b76] opacity-0 shadow group-hover:opacity-100 hover:text-[#17171c]"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {menuId === rec.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                      <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-40 overflow-hidden rounded-lg border border-[#ececf2] bg-white py-1 shadow-xl">
                        <MenuItem icon={<Pencil size={13} />} label="Rename" onClick={() => rename(rec)} />
                        <MenuItem icon={<Copy size={13} />} label="Duplicate" onClick={() => duplicate(rec)} />
                        <MenuItem icon={<Trash2 size={13} />} label="Delete" danger onClick={() => remove(rec)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`fk-press flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] font-medium hover:bg-black/[0.04] ${danger ? "text-[#c0392b]" : "text-[#4a4a55]"}`}
    >
      {icon} {label}
    </button>
  );
}
