"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
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
            aria-pressed={active}
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

const POPOVER_FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function popoverItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(POPOVER_FOCUSABLE)).filter((item) => {
    if (item.closest<HTMLElement>("[data-fk-popover]") !== root) return false;
    const rect = item.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && item.getAttribute("aria-hidden") !== "true";
  });
}

function nextSpatialItem(items: HTMLElement[], current: HTMLElement, key: string): HTMLElement | undefined {
  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  const candidates = items.flatMap((item) => {
    if (item === current) return [];
    const rect = item.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - fx;
    const dy = rect.top + rect.height / 2 - fy;
    const primary = key === "ArrowRight" ? dx : key === "ArrowLeft" ? -dx : key === "ArrowDown" ? dy : -dy;
    if (primary <= 2) return [];
    const cross = key === "ArrowRight" || key === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);
    return [{ item, score: primary * 4 + cross }];
  });
  return candidates.sort((a, b) => a.score - b.score)[0]?.item;
}

/** Animated popover shell. Mount inside a relatively-positioned parent. */
export function Popover({
  children,
  className,
  style,
  onEscape,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onEscape?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const preferred = root.querySelector<HTMLElement>("[data-popover-autofocus='true'], [aria-pressed='true'], [aria-selected='true'], [aria-current='true']");
      const target = preferred && preferred.closest("[data-fk-popover]") === root ? preferred : popoverItems(root)[0];
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (target.matches("input, textarea, select, [contenteditable='true']")) return;
    const root = rootRef.current;
    if (!root) return;
    const items = popoverItems(root);
    if (!items.length) return;
    const current = items.includes(target) ? target : items[0];
    const next = event.key === "Home"
      ? items[0]
      : event.key === "End"
        ? items.at(-1)
        : nextSpatialItem(items, current, event.key);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <motion.div
      ref={rootRef}
      data-fk-popover
      role="dialog"
      onKeyDownCapture={onKeyDown}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      className={`fk-card fk-popover-focus absolute z-50 ${className ?? ""}`}
      style={{ transformOrigin: "top left", borderRadius: 24, ...style }}
    >
      {children}
    </motion.div>
  );
}
