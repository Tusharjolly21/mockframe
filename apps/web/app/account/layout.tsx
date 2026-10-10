import type { Metadata } from "next";

// /account is a signed-in screen, not indexable content.
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
