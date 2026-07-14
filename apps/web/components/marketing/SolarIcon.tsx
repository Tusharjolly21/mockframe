import { SOLAR_ICON_BODIES } from "@/lib/generated/solarIconBodies";

/**
 * Iconify Solar icon from the curated generated set. This stays safe in client
 * components without shipping the complete 7,400-icon collection.
 */
export function SolarIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const body = SOLAR_ICON_BODIES[name.replace(/-bold-duotone$/, "")];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
