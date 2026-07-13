"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";

export function Section({ title, children, action, collapsible = false, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="px-4 pt-4 pb-1">
      <div className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="fk-press flex min-w-0 flex-1 items-center justify-between text-left"
            aria-expanded={open}
          >
            {title}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        ) : title}
        {action}
      </div>
      {(!collapsible || open) && children}
    </section>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v: number) => `${Math.round(v)}`,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex justify-between text-xs text-[#6b6b76]">
        {label}
        <em className="not-italic tabular-nums font-medium text-[#17171c]">{format(value)}</em>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Segmented control with an animated sliding thumb (shots.so feel). */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="mb-3 grid auto-cols-fr grid-flow-col gap-0.5 rounded-xl bg-[#ececf2] p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            className={`fk-press relative rounded-lg px-2 py-1.5 text-xs font-medium ${
              active ? "text-[#17171c]" : "text-[#8a8a94] hover:text-[#4a4a55]"
            }`}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_4px_rgba(20,20,40,0.12)]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mb-3 flex items-center justify-between text-xs text-[#6b6b76]">
      {label}
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-[#a0a0aa]">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export function IconButton({
  title,
  onClick,
  disabled,
  children,
  active,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`fk-press grid h-9 w-9 place-items-center rounded-xl disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-[#17171c] text-white" : "text-[#5a5a66] hover:bg-[#17171c]/6"
      }`}
    >
      {children}
    </button>
  );
}

/** Animated popover shell. Mount inside a relatively-positioned parent. */
export function Popover({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      className={`fk-card absolute z-50 ${className ?? ""}`}
      style={{ transformOrigin: "top left", borderRadius: 24, ...style }}
    >
      {children}
    </motion.div>
  );
}
