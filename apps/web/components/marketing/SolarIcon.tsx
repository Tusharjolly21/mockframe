import { icons as solar } from "@iconify-json/solar";

/**
 * Server-rendered Iconify icon from the Solar set (bold-duotone style) —
 * inlined at build time from @iconify-json/solar, no runtime fetch.
 */
export function SolarIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const icon = solar.icons[name];
  if (!icon) return null;
  return (
    <svg
      viewBox={`0 0 ${solar.width ?? 24} ${solar.height ?? 24}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}
