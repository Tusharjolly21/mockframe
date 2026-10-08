"use client";

import { X } from "lucide-react";
import {
  facetOptions,
  hasFilter,
  setFacet,
  type DeviceFacet,
  type DeviceFilter,
  type FacetOption,
  type FilterableDevice,
} from "@framekit/devices/filters";

type Tone = "dark" | "light";

const TONES: Record<Tone, { label: string; chip: string; chipOn: string; count: string; countOn: string; select: string; clear: string }> = {
  dark: {
    label: "text-zinc-500",
    chip: "border border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white",
    chipOn: "border border-white bg-white text-black",
    count: "text-zinc-500",
    countOn: "text-black/50",
    select: "border border-white/10 bg-white/[0.04] text-white hover:border-white/25 [&>option]:bg-[#18181b] [&>option]:text-white",
    clear: "text-zinc-400 hover:text-white",
  },
  light: {
    label: "text-[#8a8a94]",
    chip: "border border-[#e4e4ec] bg-white text-[#17171c] hover:border-[#c9c9d4]",
    chipOn: "border border-[#17171c] bg-[#17171c] text-white",
    count: "text-[#9a9aa4]",
    countOn: "text-white/60",
    select: "border border-[#e4e4ec] bg-white text-[#17171c] hover:border-[#c9c9d4]",
    clear: "text-[#6b6b76] hover:text-[#17171c]",
  },
};

const ROW_LABEL: Record<DeviceFacet, string> = { type: "Device", brand: "Brand", model: "Model", style: "Look" };

/**
 * Combinable device filters (device type, brand, model, look). The same bar
 * drives the /mockups library, the editor's device picker and the Store Promo
 * phone chooser, so every list narrows the same way. Each row's options are
 * counted against the other rows, so a chip never leads to an empty list.
 */
export function DeviceFilterBar({
  devices,
  filter,
  onChange,
  tone = "dark",
  facets = ["type", "brand", "model", "style"],
  compact = false,
}: {
  devices: FilterableDevice[];
  filter: DeviceFilter;
  onChange: (next: DeviceFilter) => void;
  tone?: Tone;
  /** which rows to show (the editor picker already has its own type tabs) */
  facets?: DeviceFacet[];
  compact?: boolean;
}) {
  const t = TONES[tone];
  const chipSize = compact ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]";

  const row = (facet: DeviceFacet) => {
    const options = facetOptions(devices, filter, facet);
    const chosen = filter[facet];
    // a lone option with nothing chosen adds no choice (e.g. one brand under Watch + Samsung)
    if (options.length === 0 || (options.length === 1 && !chosen)) return null;

    return (
      <div key={facet} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`w-12 shrink-0 text-[11.5px] font-semibold ${t.label}`}>{ROW_LABEL[facet]}</span>
        {facet === "model" ? (
          <ModelSelect
            options={options}
            value={chosen}
            onChange={(v) => onChange(setFacet(devices, filter, "model", v))}
            className={t.select}
            compact={compact}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={ROW_LABEL[facet]}>
            {options.map((o) => {
              const on = chosen === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(setFacet(devices, filter, facet, o.value))}
                  className={`fk-press inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${chipSize} ${on ? t.chipOn : t.chip}`}
                >
                  {o.label}
                  <span className={`text-[11px] font-medium tabular-nums ${on ? t.countOn : t.count}`}>{o.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {facets.map(row)}
      {hasFilter(filter) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className={`fk-press inline-flex w-fit items-center gap-1 text-[12px] font-semibold ${t.clear}`}
        >
          <X size={12} /> Clear filters
        </button>
      )}
    </div>
  );
}

function ModelSelect({
  options,
  value,
  onChange,
  className,
  compact,
}: {
  options: FacetOption[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  className: string;
  compact: boolean;
}) {
  return (
    <select
      aria-label="Model"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={`rounded-full font-semibold outline-none transition-colors ${compact ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]"} ${className}`}
    >
      <option value="">All models ({options.reduce((n, o) => n + o.count, 0)})</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label} ({o.count})
        </option>
      ))}
    </select>
  );
}
