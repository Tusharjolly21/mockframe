import type { Metadata } from "next";

// /profile is a signed-in account screen, not indexable content.
export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
