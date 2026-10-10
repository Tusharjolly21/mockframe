import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { VideoTemplatesView } from "@/components/templates/video/VideoTemplatesView";
import { socialMeta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promo Video Templates",
  description:
    "Animated app promo video templates with real 3D shapes, photoreal phones, laptops and tablets. Drop in your screenshots and export an MP4 for Reels, TikTok and YouTube.",
  alternates: { canonical: "/templates/video" },
  ...socialMeta({
    path: "/templates/video",
    title: "Promo Video Templates — MockFrame",
    description: "Animated app ads with 3D shapes and multi-device scenes. Drop in your screenshots, export an MP4.",
    image: "/templates/video/abstract-stack.webp",
  }),
};

export default function VideoTemplatesPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
        <VideoTemplatesView />
      </section>
      <MarketingFooter />
    </main>
  );
}
