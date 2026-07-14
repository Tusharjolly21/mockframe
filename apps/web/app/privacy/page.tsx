import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What MockFrame stores, for how long, and what it never collects.",
  alternates: { canonical: "/privacy" },
};

/* Written to answer the questions users actually ask: do uploaded images stay
   stored forever, and what analytics run. Keep every claim in here TRUE — if
   behaviour changes, change this page in the same PR. */

const SECTIONS: { title: string; body: (string | { list: string[] })[] }[] = [
  {
    title: "The short version",
    body: [
      "Your screenshots live in your browser. They only reach our servers when you explicitly use a cloud feature (drafts, share links, custom devices, templates, realistic renders) — and you can delete them. We use Google Analytics to understand product usage, but no advertising pixels or session recording.",
    ],
  },
  {
    title: "Images you upload",
    body: [
      "By default, images you add to the editor are processed entirely in your browser and are not uploaded anywhere. They are kept in memory and in your browser's local storage (IndexedDB) so your work survives a reload.",
      "Copies reach our servers (Google Firebase, EU/US data centres) only when you use a feature that needs them:",
      {
        list: [
          "Drafts / My scenes — saving a draft stores the scene and its images under your account until you delete the draft.",
          "Share links — the exported image is stored so the link works, and the link expires automatically after 7 days.",
          "Custom mockup devices — your calibrated device photo is stored under your account until you delete the device.",
          "My templates — saved templates store the composition and its styling assets (never your screenshots) until you delete them.",
          "Realistic renders (Pro) — your screenshot is uploaded so our rendering partner (Mockuuups) can composite it onto a device photo; the partner processes it per their privacy policy.",
          "Product feedback — messages and optional contact details are stored so we can respond and improve the product. Showcase submissions are never published automatically.",
        ],
      },
      "Deleting a draft, device, or template deletes its stored copies. Nothing you upload is used to train AI models, shown to other users, or sold — ever.",
    ],
  },
  {
    title: "Analytics & tracking",
    body: [
      "We use Google Analytics to measure visits, feature usage, and conversion events so we can improve MockFrame. We do not use Meta pixels, advertising trackers, or session-recording tools.",
      "Google may process basic device, browser, approximate location, and usage information under its own privacy terms. Our hosting (Vercel) and backend (Google Firebase) also keep standard operational server logs such as IP address, request path, and timestamps to run and secure the service.",
    ],
  },
  {
    title: "Account & payments",
    body: [
      "Sign-in runs on Firebase Authentication (Google sign-in, email link, or email + password). We store your email, display name, and your plan status.",
      "Payments are processed by Razorpay. Your card, UPI, or bank details go directly to Razorpay and never touch our servers; we store only your plan, its status, and payment references.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "We set functional cookies for your sign-in session and anonymous guest id so guest work carries over when you sign up. Google Analytics may also set or read analytics identifiers. We do not set advertising cookies.",
    ],
  },
  {
    title: "Your data, your call",
    body: [
      "You can delete drafts, custom devices, and templates in the app at any time. To delete your account and everything attached to it, or to ask anything about this policy, email tushar.gts7650@gmail.com — we handle deletion requests within 30 days.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-300">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <p className="text-[13px] font-medium uppercase tracking-widest text-zinc-500">Legal</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em] text-white">Privacy Policy</h1>
        <p className="mt-3 text-[15px] text-zinc-400">Last updated: July 14, 2026</p>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-medium tracking-[-0.02em] text-white">{s.title}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-400">
                {s.body.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i}>{b}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-2 pl-5">
                      {b.list.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
