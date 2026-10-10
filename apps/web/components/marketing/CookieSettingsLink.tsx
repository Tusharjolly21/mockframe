"use client";

import { OPEN_CONSENT_EVENT } from "@/lib/consent";

/** Footer link that reopens the cookie banner so a choice can be changed. */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-[13px] text-zinc-500 transition-colors hover:text-white"
    >
      Cookie settings
    </button>
  );
}
