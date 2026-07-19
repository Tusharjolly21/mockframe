"use client";

import { useRef, useState } from "react";
import { Check, Palette, Upload } from "lucide-react";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { brandTheme, loadBrandKit, saveBrandKit, type BrandKit } from "@/lib/brand";
import { applyTheme } from "@/lib/themes";
import { addAppIcon } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";

/** Toolbar popover: set the brand once (name, accent, logo), then one-click
 *  apply the derived theme / drop the logo into the scene. The promo maker
 *  reads the same kit for its default accent. */
export function BrandKitPanel({ onToast }: { onToast: (msg: string) => void }) {
  const [kit, setKit] = useState<BrandKit>(() => loadBrandKit() ?? { name: "My brand", accent: "#7c3aed", logoAssetId: null });
  const [savedTick, setSavedTick] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const bumpAssets = useViewStore((s) => s.bumpAssets);

  function persist(next: BrandKit) {
    setKit(next);
    saveBrandKit(next);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1200);
  }

  const logoUrl = kit.logoAssetId ? resolveAsset(kit.logoAssetId)?.url : undefined;

  return (
    <div className="w-64 p-3">
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#9a9aa4]">
        Brand kit {savedTick && <Check size={12} className="text-emerald-500" />}
      </p>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[11px] text-[#6b6b76]">Brand name</span>
        <input
          value={kit.name}
          maxLength={40}
          onChange={(e) => persist({ ...kit, name: e.target.value })}
          className="w-full rounded-lg border border-[#e4e4ec] px-2.5 py-1.5 text-[12.5px] text-[#17171c] outline-none focus:border-violet-400"
        />
      </label>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-[#6b6b76]">Accent colour</span>
        <input type="color" value={kit.accent} onChange={(e) => persist({ ...kit, accent: e.target.value })} className="h-7 w-12 cursor-pointer rounded border border-[#e4e4ec]" />
      </div>

      <div className="mt-2.5">
        <span className="mb-1 block text-[11px] text-[#6b6b76]">Logo</span>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Brand logo" className="h-9 w-9 rounded-lg border border-[#e4e4ec] object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-dashed border-[#c9c9d4] text-[#9a9aa4]">
              <Palette size={14} />
            </span>
          )}
          <button onClick={() => fileRef.current?.click()} className="fk-press inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ec] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#5a5a66] hover:border-[#c9c9d4]">
            <Upload size={12} /> {logoUrl ? "Replace" : "Upload"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const a = await ingestFile(f);
            bumpAssets();
            persist({ ...kit, logoAssetId: a.id });
          }}
        />
      </div>

      <div className="mt-3 space-y-1.5 border-t border-[#ececf2] pt-3">
        <button
          onClick={() => {
            setScene((s) => applyTheme(s, brandTheme(kit)));
            onToast(`${kit.name} theme applied 🎨`);
          }}
          className="fk-press w-full rounded-lg bg-[#17171c] py-2 text-[12px] font-semibold text-white hover:bg-black"
        >
          Apply brand theme to scene
        </button>
        <button
          disabled={!kit.logoAssetId}
          onClick={() => {
            if (!kit.logoAssetId) return;
            const r = addAppIcon(useSceneStore.getState().scene, kit.logoAssetId);
            setScene(() => r.scene);
            select(r.layerId);
            onToast("Logo added to the scene");
          }}
          className="fk-press w-full rounded-lg border border-[#e4e4ec] py-2 text-[12px] font-semibold text-[#5a5a66] hover:border-[#c9c9d4] disabled:opacity-40"
        >
          Add logo to scene
        </button>
        <p className="pt-0.5 text-center text-[10px] leading-4 text-[#9a9aa4]">Promo videos use your accent automatically.</p>
      </div>
    </div>
  );
}
