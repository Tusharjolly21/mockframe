import type { Metadata } from "next";
import { RecorderStudio } from "@/components/recorder/RecorderStudio";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Screen Recorder with Auto Zoom — smooth zooms, window frame, MP4 export",
  description:
    "Record your screen in the browser and get smooth automatic zooms wherever something happens, a window frame on a premium background, and an MP4 for YouTube, X, Reels or your website. Nothing to install.",
  alternates: { canonical: `${SITE_URL}/screen-recorder` },
  openGraph: {
    title: "Screen Recorder with Auto Zoom | MockFrame",
    description: "Record a tab, window or screen. Smooth auto zooms, a window frame on a background, MP4 export.",
    url: `${SITE_URL}/screen-recorder`,
  },
};

export default function ScreenRecorderPage() {
  return (
    <main className="bg-[#0b0b0f]">
      <RecorderStudio />
    </main>
  );
}
