import type { Metadata } from "next";

// internal calibration tool — never indexed
export const metadata: Metadata = {
  title: "Calibrate device photo",
  robots: { index: false, follow: false },
};

export default function CalibrateDevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
