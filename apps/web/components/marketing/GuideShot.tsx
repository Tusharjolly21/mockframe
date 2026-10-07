/**
 * A product screenshot presented in a browser window over a soft glow in the
 * guide's accent, so editor captures read as a polished product shot.
 */
export function GuideShot({
  src,
  alt,
  accent = "#a78bfa",
  url = "mockframe.app/editor",
  priority = false,
  bare = false,
  className = "",
}: {
  src: string;
  alt: string;
  accent?: string;
  url?: string;
  priority?: boolean;
  /** no browser chrome: for artwork rather than editor captures */
  bare?: boolean;
  className?: string;
}) {
  return (
    <figure className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 opacity-70 blur-3xl"
        style={{ background: `radial-gradient(60% 60% at 50% 40%, ${accent}55, transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#121218] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-black/40">
        {!bare && <div className="flex items-center gap-3 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto hidden max-w-xs flex-1 truncate rounded-md bg-white/[0.06] px-3 py-1 text-center text-[11px] text-zinc-400 sm:block">{url}</span>
          <span className="w-[46px]" aria-hidden />
        </div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className="block w-full" />
      </div>
    </figure>
  );
}
