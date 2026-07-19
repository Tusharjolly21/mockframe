import type { Metadata } from "next";
import { MobileChatBuilder } from "@/components/chat/MobileChatBuilder";

export const metadata: Metadata = {
  title: "Chat Maker — Fake Text Conversations on Your Phone",
  description:
    "Make a fake WhatsApp or iMessage conversation right from your phone: type the messages, watch the live preview, download the image. Free, no sign-up.",
  alternates: { canonical: "/chat" },
};

/** Mobile-first, single-purpose chat maker. The full editor is desktop-only;
 *  this converts the (heavily mobile) fake-chat search traffic instead of
 *  bouncing it off fixed-width panels. */
export default function ChatMakerPage() {
  return <MobileChatBuilder />;
}
