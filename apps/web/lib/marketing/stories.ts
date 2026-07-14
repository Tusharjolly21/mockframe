import type { ScreenDoc } from "@/lib/screens";

/**
 * Original fictional scripts for the marketing homepage — each a different app
 * so the row reads as real screenshots of real apps: WhatsApp (Android /
 * Samsung), Tinder, iMessage. Chat docs play live via <LiveChatStory>; the
 * Tinder card is a static profile. All fiction, written from scratch.
 */

export interface HomeStory {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  /** camera cutout for this phone's shell */
  notch: "island" | "punch";
  doc: ScreenDoc;
}

export const HOME_STORIES: HomeStory[] = [
  {
    id: "the-oven",
    eyebrow: "WhatsApp · Android",
    title: "The dinner disaster",
    blurb:
      "A first attempt at cooking for the in-laws spirals one message at a time — small setback, okay bigger setback — while Mum types back in rising panic.",
    notch: "punch",
    doc: {
      app: "whatsapp",
      chrome: { time: "9:41", battery: 100, dark: true, platform: "android" },
      contact: "Mum ❤️",
      presence: "online",
      messages: [
        { from: "me", text: "So the roast is… going", ticks: "read", dateLabel: "Today" },
        { from: "them", text: "Going WELL or going wrong" },
        { from: "me", text: "Define wrong", ticks: "read" },
        { from: "them", text: "Emily." },
        { from: "me", text: "It's a little smoky. Character.", ticks: "read" },
        { from: "them", text: "THE SMOKE ALARM IS IN THE VIDEO CALL BACKGROUND" },
        { from: "me", text: "I'd now describe it as medium smoky", ticks: "read" },
        { from: "them", text: "Open a window. Is the chicken still pink" },
        { from: "me", text: "Good news, not pink. Bad news, it's black", ticks: "read" },
        { from: "them", text: "Order pizza. Tell them it's a marinade. On my way 🚗" },
        { from: "me", text: "…the pizza place knows me by name now", ticks: "delivered" },
      ],
    },
  },
  {
    id: "the-match",
    eyebrow: "Tinder",
    title: "The perfect match",
    blurb:
      "Style a dating-app profile down to the bio and the swipe row — one of dozens of pixel-accurate app screens you can fake in seconds.",
    notch: "island",
    doc: {
      app: "dating",
      chrome: { time: "9:41", battery: 100 },
      brand: "tinder",
      name: "Priya",
      age: 27,
      verified: true,
      job: "Product Designer",
      distance: "2 miles away",
      bio: "Designs by day, climbs by weekend. Will judge your coffee order (lovingly). Dog is non-negotiable 🐕",
      interests: ["Design", "Climbing", "Coffee", "Travel", "Dogs"],
    },
  },
  {
    id: "the-audition",
    eyebrow: "iMessage",
    title: "The callback",
    blurb:
      "A nervous actor waits on a decision that could change everything, and their best friend refuses to let them spiral before the phone rings.",
    notch: "island",
    doc: {
      app: "imessage",
      chrome: { time: "9:41", battery: 100 },
      contact: "Jordan 🎭",
      status: "read",
      showHeader: true,
      messages: [
        { from: "me", text: "Still no callback. It's been 3 days." },
        { from: "them", text: "3 days is nothing. Breathe." },
        { from: "me", text: "I flubbed the monologue. I KNOW I did." },
        { from: "them", text: "You've said that after every audition you've booked" },
        { from: "me", text: "…okay that's fair" },
        { from: "them", text: "Check your phone in 5 min and text me. Trust." },
        { from: "me", text: "why 5 min. what do you know 👀" },
        { from: "them", text: "Nothing 😇 just a feeling" },
        { from: "me", text: "JORDAN. MY AGENT IS CALLING." },
        { from: "them", text: "PICK IT UP. PICK IT UP RIGHT NOW 📞" },
        { from: "me", text: "I GOT IT. I GOT THE PART 😭😭" },
      ],
    },
  },
];
