"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  filterDevices,
  filterFromParams,
  filterToParams,
  hasFilter,
  normalizeFilter,
  type DeviceFilter,
} from "@framekit/devices/filters";
import { DeviceFilterBar } from "@/components/DeviceFilterBar";
import { RevealGroup, RevealItem, Reveal } from "@/components/marketing/Reveal";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/site";

/** A device as the /mockups library needs it (kept slim: this crosses the server/client line). */
export interface MockupItem {
  id: string;
  /** registry name, used to work out the model */
  name: string;
  /** display name for the card */
  title: string;
  category: Parameters<typeof filterDevices>[0][number]["category"];
  brand: string;
  photo: boolean;
  preview: string;
  screen: [number, number];
}

function Card({ d }: { d: MockupItem }) {
  return (
    <Link
      href={`/mockups/${d.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
    >
      <div
        className="flex h-44 items-center justify-center overflow-hidden p-6"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(124,58,237,0.12), transparent 70%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.preview}
          alt={`${d.title} mockup`}
          loading="lazy"
          className="drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
          style={{ maxHeight: "100%", maxWidth: "74%", width: "auto", objectFit: "contain" }}
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] p-3.5">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-white">{d.title}</div>
          <div className="text-[11.5px] text-zinc-500">
            {d.screen[0]} × {d.screen[1]}
          </div>
        </div>
        <ArrowUpRight size={15} className="shrink-0 text-zinc-600 transition-colors group-hover:text-white" />
      </div>
    </Link>
  );
}

export function MockupsBrowser({ items }: { items: MockupItem[] }) {
  const pool = useMemo(() => items.map((d) => ({ ...d, plate: d.photo ? true : undefined })), [items]);
  const [filter, setFilter] = useState<DeviceFilter>({});

  // a shared link (?device=phone&brand=apple&model=iPhone%2016%20Pro) opens pre-filtered
  useEffect(() => {
    setFilter(normalizeFilter(pool, filterFromParams(new URLSearchParams(window.location.search))));
  }, [pool]);

  const update = (next: DeviceFilter) => {
    setFilter(next);
    const qs = filterToParams(next).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  };

  const filtered = hasFilter(filter);
  const shown = useMemo(() => filterDevices(pool, filter), [pool, filter]);
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({ cat, meta: CATEGORY_META[cat], items: pool.filter((d) => d.category === cat) })).filter(
        (g) => g.items.length > 0
      ),
    [pool]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20">
      <div className="sticky top-16 z-20 -mx-2 rounded-2xl border border-white/[0.08] bg-[#09090b]/90 px-4 py-3.5 backdrop-blur-md">
        <DeviceFilterBar devices={pool} filter={filter} onChange={update} tone="dark" />
      </div>

      {filtered ? (
        <section className="pt-8" aria-live="polite">
          <p className="text-[13px] font-medium text-zinc-500">
            {shown.length} mockup{shown.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((d) => (
              <Card key={d.id} d={d} />
            ))}
          </div>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.cat} id={g.cat} className="scroll-mt-40 pt-10">
            <Reveal>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[26px]">{g.meta.label}</h2>
                <span className="text-[13px] font-medium text-zinc-500">
                  {g.items.length} device{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-zinc-500">{g.meta.blurb}</p>
            </Reveal>

            <RevealGroup className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((d) => (
                <RevealItem key={d.id}>
                  <Card d={d} />
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        ))
      )}
    </div>
  );
}
