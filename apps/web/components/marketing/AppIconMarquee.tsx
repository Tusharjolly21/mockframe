"use client";

import {
  SiApple,
  SiDiscord,
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
} from "@icons-pack/react-simple-icons";
import { InstagramBrandIcon, XBrandIcon } from "@/components/SocialBrandIcon";

/**
 * Infinite icon marquee of the apps MockFrame can fake — a seamless loop of
 * brand glyphs, drifting left. Brand icons display their true official colors.
 */

const ICONS = [
  { Icon: SiWhatsapp, label: "WhatsApp", color: "#25D366" },
  { Icon: SiApple, label: "iMessage", color: "#34C759" },
  { Icon: InstagramBrandIcon, label: "Instagram", color: "#E1306C" },
  { Icon: SiTinder, label: "Tinder", color: "#FD297B" },
  { Icon: SiMessenger, label: "Messenger", color: "#0084FF" },
  { Icon: SiTelegram, label: "Telegram", color: "#229ED9" },
  { Icon: SiSnapchat, label: "Snapchat", color: "#FFFC00" },
  { Icon: SiTiktok, label: "TikTok", color: "#FE2C55" },
  { Icon: XBrandIcon, label: "X", color: "#FFFFFF" },
  { Icon: SiDiscord, label: "Discord", color: "#5865F2" },
  { Icon: SiSignal, label: "Signal", color: "#2F80ED" },
  { Icon: SiReddit, label: "Reddit", color: "#FF4500" },
  { Icon: SiWechat, label: "WeChat", color: "#07C160" },
  { Icon: SiLine, label: "LINE", color: "#06C755" },
  { Icon: SiViber, label: "Viber", color: "#7360F2" },
];

export function AppIconMarquee() {
  return (
    <div className="relative overflow-hidden py-4" aria-hidden>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0b0b0d] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0b0b0d] to-transparent" />
      <div className="flex w-max animate-[fk-marquee_38s_linear_infinite] gap-8 pr-8">
        {[0, 1].map((track) => (
          <div key={track} className="flex shrink-0 items-center gap-8">
            {ICONS.map(({ Icon, label, color }) => (
              <div
                key={`${track}-${label}`}
                title={label}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer hover:border-white/10"
                style={{
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <span
                  style={{ color }}
                  className="transition-transform duration-300 group-hover:scale-110 flex items-center justify-center"
                >
                  <Icon size={18} />
                </span>
                <span className="text-[12.5px] font-medium text-zinc-400 group-hover:text-white transition-colors duration-300">
                  {label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
