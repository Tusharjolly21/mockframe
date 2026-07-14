"use client";

import {
  SiApple,
  SiDiscord,
  SiInstagram,
  SiLine,
  SiMessenger,
  SiReddit,
  SiSignal,
  SiSnapchat,
  SiTelegram,
  SiTiktok,
  SiTinder,
  SiViber,
  SiWechat,
  SiWhatsapp,
  SiX,
} from "@icons-pack/react-simple-icons";

/**
 * Infinite icon marquee of the apps MockFrame can fake — a seamless loop of
 * brand glyphs, drifting left. Two identical tracks side by side so the reset
 * is invisible. Brand icons from simple-icons.
 */

const ICONS = [
  { Icon: SiWhatsapp, label: "WhatsApp" },
  { Icon: SiApple, label: "iMessage" },
  { Icon: SiInstagram, label: "Instagram" },
  { Icon: SiTinder, label: "Tinder" },
  { Icon: SiMessenger, label: "Messenger" },
  { Icon: SiTelegram, label: "Telegram" },
  { Icon: SiSnapchat, label: "Snapchat" },
  { Icon: SiTiktok, label: "TikTok" },
  { Icon: SiX, label: "X" },
  { Icon: SiDiscord, label: "Discord" },
  { Icon: SiSignal, label: "Signal" },
  { Icon: SiReddit, label: "Reddit" },
  { Icon: SiWechat, label: "WeChat" },
  { Icon: SiLine, label: "LINE" },
  { Icon: SiViber, label: "Viber" },
];

export function AppIconMarquee() {
  return (
    <div className="relative overflow-hidden py-2" aria-hidden>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0b0b0d] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0b0b0d] to-transparent" />
      <div className="flex w-max animate-[fk-marquee_38s_linear_infinite] gap-14 pr-14">
        {[0, 1].map((track) => (
          <div key={track} className="flex shrink-0 items-center gap-14">
            {ICONS.map(({ Icon, label }) => (
              <span key={`${track}-${label}`} title={label} className="text-zinc-600 transition-colors hover:text-zinc-300">
                <Icon size={30} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
