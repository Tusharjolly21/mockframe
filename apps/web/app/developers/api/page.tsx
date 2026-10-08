import type { Metadata } from "next";
import { Bot, Images, Store } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ApiKeysPanel } from "@/components/developers/ApiKeysPanel";
import { CodeTabs } from "@/components/developers/CodeTabs";
import { socialMeta } from "@/lib/site";

const DESCRIPTION =
  "Make device mockups and App Store / Google Play screenshot sets from code, or ask Claude or Cursor for them through the MockFrame MCP server.";

export const metadata: Metadata = {
  title: "Mockup API and MCP server",
  description: DESCRIPTION,
  alternates: { canonical: "/developers/api" },
  ...socialMeta({ path: "/developers/api", title: "Mockup API and MCP server — MockFrame", description: DESCRIPTION }),
};

const KEY = "mf_live_…";

const MOCKUP_CURL = `curl https://mockframe.app/api/v1/screenshots \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "screenshots": ["https://example.com/home.png"],
    "device": "auto",
    "look": "glow"
  }'`;

const MOCKUP_JS = `const res = await fetch("https://mockframe.app/api/v1/screenshots", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MOCKFRAME_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    screenshots: ["https://example.com/home.png"],
    device: "auto",
    look: "glow",
  }),
});
const { images } = await res.json();
// images: [{ name, width, height, url }]`;

const RESPONSE = `{
  "images": [
    { "name": "mockup-1.png", "width": 1080, "height": 1350, "url": "https://…" }
  ],
  "expiresAt": "2026-10-08T12:00:00.000Z"
}`;

const STORE_CURL = `curl https://mockframe.app/api/v1/screenshots \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "store-set",
    "style": "penny",
    "platform": "ios",
    "screenshots": ["upload_…", "upload_…", "upload_…"]
  }'`;

const UPLOAD_CURL = `curl https://mockframe.app/api/v1/uploads \\
  -H "Authorization: Bearer ${KEY}" \\
  --data-binary @home.png

# {"id": "upload_3f2c…", "expiresInHours": 24}`;

const MCP_CLAUDE_CODE = `claude mcp add --transport http mockframe https://mockframe.app/api/mcp \\
  --header "Authorization: Bearer ${KEY}"`;

const MCP_JSON = `{
  "mcpServers": {
    "mockframe": {
      "url": "https://mockframe.app/api/mcp",
      "headers": { "Authorization": "Bearer ${KEY}" }
    }
  }
}`;

const MCP_DESKTOP = `{
  "mcpServers": {
    "mockframe": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://mockframe.app/api/mcp",
        "--header", "Authorization: Bearer ${KEY}"
      ]
    }
  }
}`;

const SVG_JS = `const res = await fetch("https://mockframe.app/api/v1/render", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    template: "beautify-screenshot",
    screenshot: "data:image/png;base64,...",
    width: 1200, height: 900, padding: 80, radius: 24,
    backgroundFrom: "#6d28d9", backgroundTo: "#0e7490",
  }),
});
const svg = await res.text();`;

const MOCKUP_FIELDS: [string, string][] = [
  ["screenshots", "Up to 8. Each one is a public https image URL, a PNG / JPEG / WebP data URL, or an id from /api/v1/uploads."],
  ["device", '"auto" (default) picks the device that fits each screenshot\'s shape. Or a device id, e.g. iphone-17-pro, pixel-9-pro, macbook-pro-16, chrome-browser.'],
  ["look", "A finished background built from the screenshot's colours: deep, glow, soft, aurora, duotone or studio. Leave it out for the device's own background."],
  ["scale", "2 for double resolution. Default 1."],
  ["format", '"png" (default) or "jpeg".'],
];

const STORE_FIELDS: [string, string][] = [
  ["type", '"store-set"'],
  ["style", "stride (bold gradients), penny (warm), hush (calm and dark) or habitat (soft pastels). Default stride."],
  ["platform", '"ios" for App Store size (1320 × 2868) or "android" for Google Play (1080 × 1920). Default ios.'],
  ["screenshots", "Phone screenshots, in order: the first goes in the first shot, and so on. Fewer than 8 repeat to fill the set."],
];

const TOOLS: [string, string][] = [
  ["make_mockups", "Screenshots in device frames, on a designed background."],
  ["make_store_screenshots", "A set of 8 App Store or Google Play screenshots with headlines."],
  ["create_upload_link", "A link the agent can curl local files to, so it can use screenshots from your disk."],
  ["list_devices", "Every device id, by category."],
];

const LIMITS: [string, string][] = [
  ["Plan", "API keys come with Pro. Up to 5 keys per account."],
  ["Requests", "500 a day per account, shared by the API and the MCP server. Resets at midnight UTC."],
  ["Screenshots", "Up to 8 per request, 10 MB each."],
  ["Results", "Image links and uploads last 24 hours. Download what you want to keep."],
];

function Fields({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
          <dt className="font-mono text-[12.5px] text-cyan-200">{k}</dt>
          <dd className="text-[13.5px] leading-6 text-zinc-400">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/[0.07] py-14">
      <h2 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-[14.5px] leading-6 text-zinc-400">{intro}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function ApiPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <div className="mx-auto max-w-5xl px-6">
        <section className="grid grid-cols-1 items-start gap-10 pb-16 pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className="text-[14px] font-medium text-zinc-400">MockFrame for developers</p>
            <h1 className="mt-3 text-[40px] font-semibold leading-[1.03] tracking-[-0.035em] sm:text-[54px]">Mockups from one request.</h1>
            <p className="mt-5 max-w-md text-[16px] leading-7 text-zinc-400">
              Send screenshots, get back device mockups or a full App Store set. Call it from CI and scripts, or let Claude and Cursor do it for you.
            </p>
            <ul className="mt-8 space-y-3 text-[14px] text-zinc-300">
              <li className="flex gap-3"><Images size={18} className="mt-0.5 shrink-0 text-cyan-300" /> iPhone, Pixel, Galaxy, iPad, MacBook and browser mockups</li>
              <li className="flex gap-3"><Store size={18} className="mt-0.5 shrink-0 text-cyan-300" /> App Store and Google Play screenshot sets</li>
              <li className="flex gap-3"><Bot size={18} className="mt-0.5 shrink-0 text-cyan-300" /> An MCP server for Claude, Cursor and other agents</li>
            </ul>
          </div>
          <CodeTabs tabs={[{ label: "curl", code: MOCKUP_CURL }, { label: "JavaScript", code: MOCKUP_JS }]} />
        </section>

        <ApiKeysPanel />

        <Section id="mockups" title="Device mockups" intro="POST /api/v1/screenshots. Each screenshot comes back as one image in its device.">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Fields rows={MOCKUP_FIELDS} />
            <div className="space-y-3">
              <p className="text-[13px] text-zinc-500">Response</p>
              <CodeTabs tabs={[{ label: "JSON", code: RESPONSE }]} />
            </div>
          </div>
        </Section>

        <Section id="store-sets" title="Store screenshot sets" intro="The same endpoint with type store-set returns 8 listing screenshots, captions included.">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Fields rows={STORE_FIELDS} />
            <CodeTabs tabs={[{ label: "curl", code: STORE_CURL }]} />
          </div>
        </Section>

        <Section id="uploads" title="Local files" intro="POST /api/v1/uploads takes a PNG or JPEG as the request body and returns an id to put in screenshots.">
          <CodeTabs tabs={[{ label: "curl", code: UPLOAD_CURL }]} />
        </Section>

        <Section
          id="mcp"
          title="MCP server"
          intro="Add MockFrame to your agent once, then ask in plain words: “put these three screenshots in iPhones” or “make App Store screenshots from ./shots”."
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <CodeTabs
              tabs={[
                { label: "Claude Code", code: MCP_CLAUDE_CODE },
                { label: "Cursor", code: MCP_JSON },
                { label: "Claude Desktop", code: MCP_DESKTOP },
              ]}
            />
            <div>
              <p className="mb-3 text-[13px] text-zinc-500">Tools the agent gets</p>
              <Fields rows={TOOLS} />
            </div>
          </div>
          <p className="mt-5 text-[13px] leading-6 text-zinc-500">
            Cursor reads this from .cursor/mcp.json. Claude Desktop reads it from claude_desktop_config.json. Other clients that speak Streamable HTTP can use https://mockframe.app/api/mcp with the same header.
          </p>
        </Section>

        <Section id="limits" title="Limits">
          <Fields rows={LIMITS} />
          <p className="mt-5 text-[13px] leading-6 text-zinc-500">
            Errors come back as {"{ \"error\": \"…\" }"} with a status: 400 for a bad request, 401 for a missing or revoked key, 402 without Pro, 429 once the day&apos;s requests are used.
          </p>
        </Section>

        <Section
          id="svg"
          title="SVG screenshot cards"
          intro="POST /api/v1/render turns one screenshot into a self-contained SVG card. It works without a key for up to 50 cards a day, and with a key it counts toward your daily requests."
        >
          <CodeTabs tabs={[{ label: "JavaScript", code: SVG_JS }]} />
        </Section>
      </div>

      <MarketingFooter />
    </main>
  );
}
