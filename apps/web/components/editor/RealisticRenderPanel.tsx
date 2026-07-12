"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Check, ImagePlus, Loader2, Search, Sparkles, X } from "lucide-react";
import { createMockupLayer } from "@framekit/scene";
import { ingestFile, resolveAsset, type GuestAsset } from "@/lib/assets";
import { fetchCredits, fetchDevices, fetchMockups, renderScreenshotIntoMockup, type DeviceGroup, type MockuuupsItem } from "@/lib/mockuuups";
import { useSceneStore, useViewStore } from "@/lib/store";

/**
 * Realistic render (Pro) — composites the current screenshot into a photoreal
 * Mockuuups device photo (server-side) and drops the finished image onto the
 * canvas as a full-bleed background, so you can still annotate on top.
 * Coexists with the live SVG/PSD editor; it does not replace it.
 */
export function RealisticRenderPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const selectedIds = useViewStore((s) => s.selectedIds);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);
  const bumpAssets = useViewStore((s) => s.bumpAssets);

  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [cat, setCat] = useState("");
  const [device, setDevice] = useState("");
  const [items, setItems] = useState<MockuuupsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [hd, setHd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [override, setOverride] = useState<GuestAsset | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  // Source screenshot: the selected mockup's media, else the first mockup with media.
  const sceneSourceId = useMemo(() => {
    const withMedia = scene.layers.filter((l) => l.type === "mockup" && l.media);
    const sel = withMedia.find((l) => selectedIds.includes(l.id)) ?? withMedia[0];
    return sel && sel.type === "mockup" ? sel.media?.assetId : undefined;
  }, [scene.layers, selectedIds]);
  const source = override ?? (sceneSourceId ? resolveAsset(sceneSourceId) : undefined);

  // credits + the full categorized device catalog; default to the newest model
  useEffect(() => {
    fetchCredits().then(setCredits);
    fetchDevices()
      .then((g) => {
        setGroups(g);
        if (g[0]?.devices[0]) {
          setCat(g[0].key);
          // prefer a flagship default (most scenes) over whatever sorts first
          const flagship = g[0].devices.find((d) => d.slug === "iphone-17-pro");
          setDevice((flagship ?? g[0].devices[0]).slug);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        setLoadErr(e instanceof Error ? e.message : "Couldn't load devices");
        setLoading(false);
      });
  }, []);

  // (re)load mockups whenever the selected device model changes
  useEffect(() => {
    if (!device) return;
    let alive = true;
    setItems([]);
    setPage(1);
    setPick(null);
    setLoading(true);
    fetchMockups(1, device)
      .then((r) => {
        if (!alive) return;
        setItems(r.mockups);
        setHasMore(r.hasMore);
        setLoadErr(null);
      })
      .catch((e) => alive && setLoadErr(e instanceof Error ? e.message : "Couldn't load mockups"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [device]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoading(true);
    fetchMockups(next, device)
      .then((r) => {
        setItems((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...r.mockups.filter((m) => !seen.has(m.id))];
        });
        setHasMore(r.hasMore);
      })
      .finally(() => setLoading(false));
  }

  const catDevices = useMemo(() => groups.find((g) => g.key === cat)?.devices ?? [], [groups, cat]);
  const deviceTitle = useMemo(() => catDevices.find((d) => d.slug === device)?.title ?? "", [catDevices, device]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((m) => m.title.toLowerCase().includes(needle)) : items;
  }, [items, q]);

  function pickCategory(key: string) {
    const g = groups.find((x) => x.key === key);
    if (!g?.devices[0]) return;
    setCat(key);
    setDevice(g.devices[0].slug);
  }

  async function doRender() {
    if (!source || !pick || busy) return;
    setBusy(true);
    try {
      const asset = await renderScreenshotIntoMockup(source, pick, hd);
      bumpAssets();
      // Drop the render in as an EDITABLE frameless mockup layer (not a flat
      // background) so all the tools still work: Transform (size/angle/tilt),
      // Quick Layouts, 3D drag, background/effects/border behind it, and text
      // on top. The frameless <img> renders at its natural size, so a scale-1
      // layer on a canvas sized to the render fills it edge-to-edge like before.
      // `render` keeps the ORIGINAL screenshot + params so "Edit screenshot"
      // edits the screen content (not the whole composite) and re-renders it.
      const layer = createMockupLayer({
        deviceId: null,
        media: { assetId: asset.id, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 },
        render: { sourceAssetId: source.id, mockupId: pick, hd },
      });
      layer.transform = { ...layer.transform, scale: 1 };
      layer.cornerRadius = 0;
      setScene((s) => ({
        ...s,
        canvas: { ...s.canvas, width: asset.width, height: asset.height },
        // replace the old device mockup with the photoreal one; keep annotations
        layers: [...s.layers.filter((l) => l.type !== "mockup"), layer],
      }));
      setActiveLayout(null);
      select(layer.id);
      fetchCredits().then(setCredits);
      onToast("Realistic render added ✨");
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(false);
    }
  }

  const ui = (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="fk-card flex h-[min(660px,88vh)] w-[min(940px,94vw)] flex-col overflow-hidden rounded-3xl p-0"
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 460, damping: 34 }}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-[#ececf2] px-5 py-3.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#17171c]">
              Realistic render
              <span className="rounded-md bg-[#17171c] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Pro</span>
            </h2>
            <p className="text-[11.5px] text-[#8a8a94]">Composite your screenshot into a photoreal device shot.</p>
          </div>
          {credits != null && (
            <span className="rounded-full bg-[#f0f0f5] px-3 py-1 text-[11px] font-semibold text-[#6b6b76]">{credits} credits</span>
          )}
          <button onClick={onClose} className="fk-press grid h-8 w-8 place-items-center rounded-xl text-[#8a8a94] hover:bg-black/6">
            <X size={16} />
          </button>
        </div>

        {/* category tabs */}
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => pickCategory(g.key)}
              className={`fk-press rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                cat === g.key ? "bg-[#17171c] text-white" : "bg-[#f0f0f5] text-[#6b6b76] hover:bg-[#e6e6ee]"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {/* device-model chips (scrollable) */}
        <div className="flex gap-1.5 overflow-x-auto px-5 py-2.5">
          {catDevices.map((d) => (
            <button
              key={d.slug}
              onClick={() => setDevice(d.slug)}
              className={`fk-press shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium ${
                device === d.slug
                  ? "border-[#17171c] bg-[#17171c] text-white"
                  : "border-[#e4e4ec] bg-white text-[#4a4a55] hover:border-[#c9c9d6]"
              }`}
            >
              {d.title}
            </button>
          ))}
        </div>
        {/* device header + scene search */}
        <div className="flex items-center gap-3 px-5 pb-1">
          <span className="text-[12px] font-semibold text-[#8a8a94]">
            {deviceTitle && `${deviceTitle} · ${shown.length}${hasMore ? "+" : ""} scenes`}
          </span>
          <div className="ml-auto flex w-48 items-center gap-2 rounded-lg bg-[#f4f4f8] px-2.5 py-1">
            <Search size={13} className="shrink-0 text-[#9a9aa4]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search scenes…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#17171c] outline-none placeholder:text-[#a0a0aa]"
            />
          </div>
        </div>

        {/* grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {loadErr ? (
            <p className="py-10 text-center text-[13px] text-[#c0392b]">{loadErr}</p>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
                {shown.map((m) => {
                  const active = pick === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPick(m.id)}
                      title={m.title}
                      className={`fk-press group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#f4f4f8] text-left ${
                        active ? "border-[#17171c]" : "border-transparent hover:border-[#d6d6e0]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.thumbnail} alt={m.title} loading="lazy" className="aspect-[3/2] w-full object-cover" />
                      <span className="truncate px-2 py-1.5 text-[11px] font-medium capitalize text-[#4a4a55]">
                        {m.title.replace(/^.*?\bmockup\b/i, "").trim() || m.device}
                      </span>
                      {active && (
                        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#17171c] text-white">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {loading && (
                <div className="flex justify-center py-6 text-[#9a9aa4]">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              )}
              {!loading && hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    className="fk-press rounded-xl bg-[#f0f0f5] px-4 py-2 text-[12.5px] font-semibold text-[#4a4a55] hover:bg-[#e6e6ee]"
                  >
                    Load more
                  </button>
                </div>
              )}
              {!loading && shown.length === 0 && <p className="py-10 text-center text-[13px] text-[#9a9aa4]">No mockups match.</p>}
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-3 border-t border-[#ececf2] px-5 py-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="fk-press flex items-center gap-2 rounded-xl bg-[#f4f4f8] px-3 py-2 text-[12.5px] font-semibold text-[#4a4a55] hover:bg-[#e6e6ee]"
          >
            {source ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={source.url} alt="" className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <ImagePlus size={16} />
            )}
            {source ? "Change screenshot" : "Upload screenshot"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setOverride(await ingestFile(f));
              } catch (err) {
                onToast(err instanceof Error ? err.message : "Couldn't read image");
              }
              e.target.value = "";
            }}
          />

          <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b76]">
            <input type="checkbox" checked={hd} onChange={(e) => setHd(e.target.checked)} />
            HD (2× credits)
          </label>

          <div className="flex-1" />

          <button
            onClick={doRender}
            disabled={!source || !pick || busy}
            className="fk-press flex items-center gap-2 rounded-xl bg-[#17171c] px-5 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? "Rendering…" : "Render"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Portal to <body>: the Toolbar lives inside a `-translate-x-1/2` transform
  // wrapper, and a transformed ancestor makes `position:fixed` resolve relative
  // to that wrapper (not the viewport) — which trapped the modal under the right
  // panel. Rendering into <body> escapes the transform + pointer-events layer.
  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
