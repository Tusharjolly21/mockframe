import { SITE_NAME } from "@/lib/site";

/**
 * MockFrame brand mark — a viewfinder framing a screen (mockups + frames),
 * on the violet→cyan brand gradient. Used in the nav, footer, editor and the
 * export badge so the identity is consistent everywhere.
 */
export function BrandMark({ size = 28, className = "", rounded = 9 }: { size?: number; className?: string; rounded?: number }) {
  const s = size * 0.6;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 ${className}`}
      style={{ width: size, height: size, borderRadius: rounded }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.4V6.3A2.3 2.3 0 0 1 6.3 4H8.4" />
        <path d="M15.6 4h2.1A2.3 2.3 0 0 1 20 6.3v2.1" />
        <path d="M20 15.6v2.1a2.3 2.3 0 0 1-2.3 2.3h-2.1" />
        <path d="M8.4 20H6.3A2.3 2.3 0 0 1 4 17.7v-2.1" />
      </svg>
      <span className="absolute rounded-[2.5px] bg-white" style={{ width: size * 0.2, height: size * 0.2 }} />
    </span>
  );
}

/** Mark + wordmark lockup. */
export function BrandLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
    </span>
  );
}
