import type { ScreenDoc } from "@/lib/screens";

/**
 * Original fictional chat-story scripts for the marketing homepage. Each is a
 * self-contained mini-narrative with a payoff — the same format that keeps
 * viewers to the last message on TikTok/Reels. All fiction, written from
 * scratch. Played live via <LiveChatStory>, so what shows IS what exports.
 */

export interface HomeStory {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  doc: ScreenDoc;
}

export const HOME_STORIES: HomeStory[] = [
  {
    id: "the-oven",
    eyebrow: "Viral prank",
    title: "The dinner disaster",
    blurb:
      "A first attempt at cooking for the in-laws spirals one message at a time — small setback, okay bigger setback — while Mum types back in rising panic.",
    doc: {
      app: "whatsapp",
      chrome: { time: "9:41", battery: 100, dark: true },
      contact: "Mum ❤️",
      presence: "online",
      messages: [
        { from: "me", text: "So the roast is… going", ticks: "read", dateLabel: "Today" },
        { from: "them", text: "Going WELL or going wrong" },
        { from: "me", text: "Define wrong", ticks: "read" },
        { from: "them", text: "Emily." },
        { from: "me", text: "It's a little smoky. Character.", ticks: "read" },
        { from: "them", text: "THE SMOKE ALARM IS IN THE VIDEO CALL BACKGROUND" },
        { from: "me", text: "I would now describe it as medium smoky", ticks: "read" },
        { from: "them", text: "Open a window. Is the chicken still pink" },
        { from: "me", text: "Good news, it is not pink. Bad news, it is black", ticks: "read" },
        { from: "them", text: "Order pizza. Tell them it's a marinade. I'm on my way 🚗" },
        { from: "me", text: "…the pizza place also knows me by name now", ticks: "delivered" },
      ],
    },
  },
  {
    id: "the-audition",
    eyebrow: "Feel-good",
    title: "The callback",
    blurb:
      "A nervous actor waits on a decision that could change everything, and their best friend refuses to let them spiral before the phone rings.",
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
        { from: "them", text: "You've said that after every audition you've ever booked" },
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
  {
    id: "the-launch",
    eyebrow: "For brands",
    title: "The drop sells out",
    blurb:
      "A customer catches wind of a restock and races the clock — the kind of hype-cycle chat a brand can turn into ad creative that doesn't feel like an ad.",
    doc: {
      app: "whatsapp",
      chrome: { time: "9:41", battery: 100, dark: false },
      contact: "Lumen Studio",
      presence: "typing…",
      messages: [
        { from: "them", text: "Maya! 🔔 The sold-out lamp is back — 40 units only", dateLabel: "Today" },
        { from: "me", text: "wait for real?? the warm one??", ticks: "read" },
        { from: "them", text: "The warm one. Link's live now" },
        { from: "me", text: "buying. buying right now", ticks: "read" },
        { from: "them", text: "🏃 they're going fast — 22 left" },
        { from: "me", text: "ORDER CONFIRMED. I have never moved so fast", ticks: "read" },
        { from: "them", text: "Ships tomorrow 🚚 you got the last of the warm batch" },
        { from: "me", text: "telling everyone I know. this thing is gorgeous 😍", ticks: "delivered" },
      ],
    },
  },
];
