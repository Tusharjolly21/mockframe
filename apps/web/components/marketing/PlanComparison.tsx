import { Check, Minus } from "lucide-react";

/** A cell is included (true), not included (false), or a short value. */
type Cell = boolean | string;

const GROUPS: { title: string; rows: [label: string, free: Cell, pro: Cell][] }[] = [
  {
    title: "Mockups",
    rows: [
      ["Every device frame and the full editor", true, true],
      ["Custom devices from your own photos", true, true],
      ["Backgrounds", "Core set", "Every collection"],
      ["Website capture", "Visible area", "Full page"],
      ["Photoreal device renders", false, true],
    ],
  },
  {
    title: "Chat screens",
    rows: [
      ["WhatsApp and iMessage", true, true],
      ["Telegram, Instagram, Slack, Discord and 8 more", false, true],
    ],
  },
  {
    title: "Store screenshots",
    rows: [
      ["App Store and Google Play screenshot packs", "1 pack", "Unlimited"],
      ["AI pack from your app description", "2 packs", "Up to 20 a day"],
      ["Captions in 39 store languages", "Type them in", "AI translation"],
      ["fastlane-ready zip", true, true],
    ],
  },
  {
    title: "Video",
    rows: [
      ["Video and GIF export", false, "60 fps, up to 4K"],
      ["Animated app promo videos", false, true],
      ["Text animations", false, true],
    ],
  },
  {
    title: "Export and rights",
    rows: [
      ["Image export", "Up to 3×", "Up to 6K"],
      ["Watermark", "None", "None, or your logo"],
      ["License", "Personal use", "Commercial use"],
      ["Autosave, drafts and cloud sync", true, true],
      ["Saved templates and a shared team library", false, true],
    ],
  },
];

function Value({ cell, pro }: { cell: Cell; pro?: boolean }) {
  if (cell === true) return <Check size={16} className={pro ? "text-violet-300" : "text-zinc-300"} aria-label="Included" />;
  if (cell === false) return <Minus size={16} className="text-zinc-700" aria-label="Not included" />;
  return <span className={pro ? "text-white" : "text-zinc-400"}>{cell}</span>;
}

/** Free vs Pro, row by row: the detail behind the two plan cards. */
export function PlanComparison() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <caption className="sr-only">Free and Pro plans compared</caption>
        <colgroup>
          <col />
          <col className="w-[26%]" />
          <col className="w-[26%] bg-violet-500/[0.06]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/10">
            <th scope="col" className="py-4 pr-4 font-normal text-zinc-500">
              <span className="sr-only">Feature</span>
            </th>
            <th scope="col" className="px-4 py-4 text-[15px] font-semibold text-white">Free</th>
            <th scope="col" className="rounded-t-xl px-4 py-4 text-[15px] font-semibold text-white">Pro</th>
          </tr>
        </thead>
        {GROUPS.map((group) => (
          <tbody key={group.title}>
            <tr>
              <th scope="rowgroup" colSpan={3} className="pb-2 pr-4 pt-8 text-[13px] font-semibold text-violet-300">
                {group.title}
              </th>
            </tr>
            {group.rows.map(([label, free, pro]) => (
              <tr key={label} className="border-t border-white/[0.06]">
                <th scope="row" className="py-3 pr-4 font-normal text-zinc-300">{label}</th>
                <td className="px-4 py-3"><Value cell={free} /></td>
                <td className="px-4 py-3"><Value cell={pro} pro /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
