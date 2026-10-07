import { describe, expect, it } from "vitest";
import {
  PostImportError,
  htmlToText,
  parseBlueskyThread,
  parseFxTweet,
  parseMastodonStatus,
  parseOpenGraphPost,
  parsePostUrl,
  postTime,
} from "../server/postImport";

describe("parsePostUrl", () => {
  it("recognises every supported provider and URL shape", () => {
    expect(parsePostUrl("https://x.com/jack/status/20")).toMatchObject({ provider: "x", handle: "jack", id: "20" });
    expect(parsePostUrl("https://mobile.twitter.com/jack/status/20?s=21")).toMatchObject({ provider: "x", id: "20" });
    expect(parsePostUrl("https://x.com/i/web/status/1234")).toMatchObject({ provider: "x", id: "1234", handle: "" });
    expect(parsePostUrl("https://fxtwitter.com/a/status/9")).toMatchObject({ provider: "x", id: "9" });
    expect(parsePostUrl("https://bsky.app/profile/alice.bsky.social/post/3kxyz")).toMatchObject({ provider: "bluesky", actor: "alice.bsky.social", rkey: "3kxyz" });
    expect(parsePostUrl("https://www.threads.net/@zuck/post/C8abc_-1")).toMatchObject({ provider: "threads" });
    expect(parsePostUrl("https://threads.com/@zuck/post/C8abc")).toMatchObject({ provider: "threads" });
    expect(parsePostUrl("https://www.linkedin.com/posts/jane_launch-activity-123")).toMatchObject({ provider: "linkedin" });
    expect(parsePostUrl("https://mastodon.social/@Gargron/109")).toMatchObject({ provider: "mastodon", acct: "Gargron", id: "109" });
  });
  it("upgrades Mastodon links to https", () => {
    const t = parsePostUrl("http://fosstodon.org/@a/1");
    expect(t.provider === "mastodon" && t.url.protocol).toBe("https:");
  });
  it("explains what's wrong instead of guessing", () => {
    expect(() => parsePostUrl("x.com/jack")).toThrow(PostImportError);
    expect(() => parsePostUrl("https://x.com/jack")).toThrow(/isn't a post/);
    expect(() => parsePostUrl("https://www.instagram.com/p/abc/")).toThrow(/X, Bluesky, Threads, LinkedIn or Mastodon/);
    expect(() => parsePostUrl("https://threads.net/@zuck")).toThrow(/isn't a post/);
    expect(() => parsePostUrl("https://example.com:8443/@a/1")).toThrow(PostImportError);
  });
});

describe("htmlToText", () => {
  it("keeps paragraphs and decodes every entity once", () => {
    expect(htmlToText("<p>Hello</p><p>World &amp;amp; friends</p>")).toBe("Hello\n\nWorld &amp; friends");
    expect(htmlToText("It&#x27;s &#8220;fine&#8221; &#x1F680;<br>next")).toBe("It's “fine” 🚀\nnext");
    expect(htmlToText("a &lt;b&gt; c")).toBe("a <b> c");
  });
});

describe("postTime", () => {
  it("formats like the networks do, in UTC", () => {
    expect(postTime(1700000000)).toBe("10:13 PM · Nov 14, 2023");
    expect(postTime("2024-03-04T15:42:00.000Z")).toBe("3:42 PM · Mar 4, 2024");
    expect(postTime("nope")).toBe("");
  });
});

describe("parseFxTweet", () => {
  const data = {
    tweet: {
      text: "Shipping v2 today 🚀 https://t.co/abc123",
      created_timestamp: 1700000000,
      replies: 12,
      retweets: 340,
      likes: 5100,
      author: { name: "Jane", screen_name: "jane", avatar_url: "https://pbs.twimg.com/profile_images/1/a_normal.jpg", verification: { verified: true } },
      media: { photos: [{ url: "https://pbs.twimg.com/media/1.jpg" }], videos: [{ thumbnail_url: "https://pbs.twimg.com/v/2.jpg" }] },
    },
  };
  it("maps author, metrics, photos and drops the trailing media link", () => {
    const p = parseFxTweet(data, { handle: "jane" }, "https://x.com/jane/status/1");
    expect(p).toMatchObject({ name: "Jane", subtitle: "@jane", verified: true, likes: 5100, comments: 12, shares: 340, hasMetrics: true, text: "Shipping v2 today 🚀" });
    expect(p.avatar).toBe("https://pbs.twimg.com/profile_images/1/a_400x400.jpg");
    expect(p.images).toEqual(["https://pbs.twimg.com/media/1.jpg", "https://pbs.twimg.com/v/2.jpg"]);
  });
  it("errors clearly on missing posts", () => {
    expect(() => parseFxTweet({}, { handle: "x" }, "u")).toThrow(/private, deleted/);
  });
});

describe("parseBlueskyThread", () => {
  it("maps author, images and counts", () => {
    const p = parseBlueskyThread(
      {
        thread: {
          post: {
            author: { displayName: "Alice", handle: "alice.bsky.social", avatar: "https://cdn.bsky.app/a.jpg" },
            record: { text: "Hi", createdAt: "2024-03-04T15:42:00.000Z" },
            embed: { $type: "app.bsky.embed.images#view", images: [{ fullsize: "https://cdn.bsky.app/1.jpg" }] },
            likeCount: 3,
            replyCount: 1,
            repostCount: 2,
            quoteCount: 1,
          },
        },
      },
      "https://bsky.app/profile/alice.bsky.social/post/1"
    );
    expect(p).toMatchObject({ name: "Alice", subtitle: "@alice.bsky.social", likes: 3, comments: 1, shares: 3, images: ["https://cdn.bsky.app/1.jpg"] });
  });
});

describe("parseMastodonStatus", () => {
  it("keeps paragraphs, content warnings, avatar and images", () => {
    const p = parseMastodonStatus(
      {
        content: "<p>Line one</p><p>Line two &amp; more</p>",
        spoiler_text: "Launch",
        created_at: "2024-03-04T15:42:00.000Z",
        favourites_count: 4,
        account: { display_name: "Eu&#39;gen", acct: "Gargron", avatar_static: "https://files.example/a.png" },
        media_attachments: [{ type: "image", url: "https://files.example/1.png" }, { type: "video", preview_url: "https://files.example/2.png" }],
      },
      { url: new URL("https://mastodon.social/@Gargron/1"), acct: "Gargron" }
    );
    expect(p.text).toBe("Launch\n\nLine one\n\nLine two & more");
    expect(p).toMatchObject({ name: "Eu'gen", subtitle: "@Gargron@mastodon.social", likes: 4, avatar: "https://files.example/a.png" });
    expect(p.images).toEqual(["https://files.example/1.png", "https://files.example/2.png"]);
  });
});

describe("parseOpenGraphPost", () => {
  it("splits the Threads title into name and handle and hides metrics", () => {
    const html = `<meta property="og:title" content="Jane Doe (&#064;jane.doe) on Threads"><meta property="og:description" content="Big news &#x1F389;">`;
    const p = parseOpenGraphPost(html, "threads", "https://www.threads.com/@jane.doe/post/1");
    expect(p).toMatchObject({ name: "Jane Doe", subtitle: "@jane.doe", text: "Big news 🎉", hasMetrics: false });
  });
  it("explains login walls", () => {
    expect(() => parseOpenGraphPost("<html></html>", "linkedin", "https://www.linkedin.com/posts/x")).toThrow(/signed-in members/);
  });
});
