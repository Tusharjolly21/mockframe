"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clapperboard, Crown, LayoutGrid, Link2, MonitorSmartphone, SearchX, Smartphone, Sparkles, Store } from "lucide-react";
import {
  CARD_LOOKS,
  TEMPLATES,
  templatePreviewUrl,
  activeSceneGroups,
  groupPreviewUrl,
  scenesInGroup,
} from "@/lib/screenTemplates";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { SocialBrandIcon } from "@/components/SocialBrandIcon";
import { StoreSetsSection, storeSetMatches } from "@/components/templates/StoreSetsSection";
import { PremiumTemplatesSection, premiumMatches } from "@/components/templates/PremiumTemplatesSection";
import { LiveScene } from "@/components/templates/LiveScene";
import { TemplateFinder, useShots } from "@/components/templates/TemplateFinder";
import { sceneTemplateWithShots } from "@/lib/myShots";
import {
  APP_SCREEN_USES,
  CARD_USES,
  isFiltering,
  matchesTemplate,
  NO_FILTER,
  POST_USES,
  SCENE_GROUP_USES,
  type TemplateFilter,
} from "@/lib/templateSearch";
import { PREMIUM_TEMPLATES } from "@/lib/premiumTemplates";
import { PROMO_TEMPLATES } from "@/lib/promo/registry";
import { STORE_SETS } from "@/lib/storeSets";
import { APP_SCREEN_TEMPLATES, APP_TEMPLATE_CATEGORIES, type AppTemplateCategory } from "@/lib/appScreenTemplates";
import { encodeScreenAsset, resolveScreenAsset } from "@/lib/screens";

const appScreenMatches = (filter: TemplateFilter) =>
  APP_SCREEN_TEMPLATES.filter((t) => matchesTemplate(filter, { text: [t.label, t.blurb, t.category, t.app, "app screen phone", t.web ? "web browser desktop" : ""], uses: APP_SCREEN_USES[t.category] ?? [] }));

/** "App screenshots": phone + editable app screen templates, filterable by kind. */
function AppScreenTemplates({ filter }: { filter: TemplateFilter }) {
  const [cat, setCat] = useState<AppTemplateCategory | "All">("All");
  // rendered after mount: screen text is measured with the browser's fonts,
  // so a server render would differ and break hydration
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  useEffect(() => {
    setPreviews(Object.fromEntries(APP_SCREEN_TEMPLATES.map((t) => [t.slug, resolveScreenAsset(encodeScreenAsset(t.doc()))?.url ?? null])));
  }, []);
  const matching = appScreenMatches(filter);
  // a search can leave the picked kind empty: fall back to all of them
  const kind = cat !== "All" && !matching.some((t) => t.category === cat) ? "All" : cat;
  const shown = matching.filter((t) => kind === "All" || t.category === kind);
  if (!matching.length) return null;
  return (
    <>
      <Reveal>
        <div id="app-screens" className="mt-16 flex scroll-mt-24 flex-col justify-between gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">App screenshots</p>
            <h2 className="mt-1 text-[24px] font-semibold">Realistic app screens in real phones</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...APP_TEMPLATE_CATEGORIES.filter((c) => matching.some((t) => t.category === c))] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${kind === c ? "bg-white text-zinc-950" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Reveal>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => (
          <Link
            key={t.slug}
            href={`/templates/${t.slug}`}
            className="group block overflow-hidden rounded-lg border border-white/10 bg-[#101116] transition-colors hover:border-white/25"
          >
            <div className="relative flex h-72 flex-col items-center overflow-hidden px-4 pt-5" style={{ background: t.cardBg }}>
              {t.headline ? (
                <p className="mb-3 text-center text-[13px] font-extrabold tracking-tight" style={{ color: t.ink ?? "#ffffff" }}>{t.headline}</p>
              ) : null}
              {t.web ? (
                <div className="mt-3 w-full shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 shadow-[0_18px_30px_rgba(0,0,0,.35)] ring-1 ring-white/20 transition-transform duration-300 group-hover:-translate-y-1">
                  <div className="flex h-[18px] items-center gap-1 bg-zinc-200 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
                    <span className="ml-2 h-2.5 flex-1 truncate rounded-full bg-white px-2 text-[6px] leading-[10px] text-zinc-500">{t.browserUrl}</span>
                  </div>
                  {previews[t.slug] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[t.slug]!} alt={`${t.label} page`} className="block w-full" />
                  ) : (
                    <div className="aspect-[16/10] w-full bg-zinc-200" />
                  )}
                </div>
              ) : (
                <div className="w-[52%] shrink-0 rounded-[22px] bg-zinc-900 p-[5px] shadow-[0_18px_30px_rgba(0,0,0,.35)] ring-1 ring-white/20 transition-transform duration-300 group-hover:-translate-y-1">
                  {previews[t.slug] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[t.slug]!} alt={`${t.label} screen`} className="w-full rounded-[18px]" />
                  ) : (
                    <div className="aspect-[402/874] w-full rounded-[18px] bg-white/10" />
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.08] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[14px] font-semibold">{t.label}</h3>
                <ArrowUpRight size={15} className="shrink-0 text-zinc-600 transition-colors group-hover:text-white" />
              </div>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">{t.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [postUrl, setPostUrl] = useState("");
  const groups = activeSceneGroups();
  const postTemplate = TEMPLATES.find((template) => template.slug === "post")!;
  const postPreview = templatePreviewUrl(postTemplate);
  const [filter, setFilter] = useState<TemplateFilter>(NO_FILTER);
  const shots = useShots();
  const filtering = isFiltering(filter);

  const showPost = matchesTemplate(filter, { text: [postTemplate.label, postTemplate.blurb, "x twitter bluesky threads linkedin mastodon tweet"], uses: POST_USES });
  const tools = TEMPLATES.filter(
    (t) => t.slug !== "post" && matchesTemplate(filter, { text: [t.label, t.blurb, "content card"], uses: CARD_USES[t.app ?? ""] ?? [] })
  );
  const shownGroups = groups.filter((g) =>
    matchesTemplate(filter, {
      text: [g.label, g.blurb, "device scene photoreal mockup", ...scenesInGroup(g.id).map((t) => t.label)],
      uses: SCENE_GROUP_USES[g.id] ?? [],
    })
  );
  // each device collection's card shows its first scene your screenshot fits
  const groupScenes = useMemo(() => {
    const out: Record<string, ReturnType<typeof sceneTemplateWithShots>> = {};
    if (!shots.length) return out;
    for (const g of activeSceneGroups()) {
      for (const t of scenesInGroup(g.id)) {
        const scene = sceneTemplateWithShots(t, shots);
        if (scene) {
          out[g.id] = scene;
          break;
        }
      }
    }
    return out;
  }, [shots]);
  const nothing =
    filtering &&
    !premiumMatches(filter).length &&
    !storeSetMatches(filter).length &&
    !showPost &&
    !appScreenMatches(filter).length &&
    !tools.length &&
    !shownGroups.length;

  const openPost = () => {
    const url = postUrl.trim();
    router.push(url ? `/templates/post?url=${encodeURIComponent(url)}` : "/templates/post");
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
        <Reveal>
          <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0e0f14] px-6 py-10 sm:px-10 sm:py-14">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,.35),transparent_65%)]" />
            <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/3 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.18),transparent_65%)]" />
            <p className="relative inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-zinc-300">
              <Sparkles size={13} className="text-cyan-300" /> Template library
            </p>
            <h1 className="relative mt-5 max-w-3xl text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[58px]">
              Start from something{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">already beautiful.</span>
            </h1>
            <p className="relative mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
              Premium launch layouts, store listing sets, realistic app screens, data cards and photoreal device scenes. Every template opens fully editable, so you only swap in what is yours.
            </p>
            <nav aria-label="Template sections" className="relative mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: "#premium", icon: Crown, label: "Premium layouts", meta: `${PREMIUM_TEMPLATES.length} layouts · ${PREMIUM_TEMPLATES.filter((t) => !t.pro).length} free` },
                { href: "#store-sets", icon: Store, label: "Store listing sets", meta: `${STORE_SETS.length} sets · 8 shots each` },
                { href: "#app-screens", icon: Smartphone, label: "App screens", meta: `${APP_SCREEN_TEMPLATES.length} screens` },
                { href: "#content-cards", icon: LayoutGrid, label: "Content cards", meta: `${TEMPLATES.length} cards` },
                { href: "#device-scenes", icon: MonitorSmartphone, label: "Device scenes", meta: `${groups.length} collections` },
                { href: "/templates/video", icon: Clapperboard, label: "Video templates", meta: `${PROMO_TEMPLATES.length} animated ads · New` },
              ].map(({ href, icon: Icon, label, meta }) => (
                <a
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-zinc-200"><Icon size={17} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-white">{label}</span>
                    <span className="block text-[11.5px] text-zinc-500">{meta}</span>
                  </span>
                  <ArrowRight size={15} className="ml-auto text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </a>
              ))}
            </nav>
          </header>
        </Reveal>

        <TemplateFinder filter={filter} onFilter={setFilter} />

        {nothing && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <SearchX size={26} className="mx-auto text-zinc-500" />
            <p className="mt-3 text-[16px] font-semibold">No templates match{filter.query.trim() ? ` "${filter.query.trim()}"` : ""}</p>
            <p className="mt-1 text-[13.5px] text-zinc-500">Try a shorter search, or look through everything.</p>
            <button type="button" onClick={() => setFilter(NO_FILTER)} className="mt-5 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200">
              Show all templates
            </button>
          </div>
        )}

        {!filtering && <Reveal>
          <Link
            href="/templates/video"
            className="group relative mt-10 grid overflow-hidden rounded-[24px] border border-white/10 bg-[#101116] transition-colors hover:border-white/25 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.3),transparent_65%)]" />
            <div className="relative flex flex-col justify-center p-6 sm:p-9 lg:p-12">
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-zinc-300">
                <Clapperboard size={13} className="text-violet-300" /> Video templates
                <span className="ml-1 rounded-full bg-white px-1.5 text-[10px] font-bold uppercase text-zinc-950">New</span>
              </p>
              <h2 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[36px]">Animated app ads, with real 3D and every device.</h2>
              <p className="mt-3 max-w-md text-[14px] leading-6 text-zinc-400">
                {PROMO_TEMPLATES.length} promo video templates for Reels, TikTok and YouTube. Drop in your screenshots and export an MP4.
              </p>
              <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-950 transition-colors group-hover:bg-zinc-200">
                See the video templates <ArrowRight size={15} />
              </span>
            </div>
            <div className="relative flex items-end justify-center gap-3 overflow-hidden px-6 pt-8 sm:gap-4 lg:pt-10">
              {["abstract-stack", "everywhere", "desktop-studio", "ui-showcase"].map((id, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={id}
                  src={`/templates/video/${id}.webp`}
                  alt=""
                  loading="lazy"
                  className={`aspect-[9/16] w-[23%] max-w-[170px] rounded-t-2xl border border-b-0 border-white/15 object-cover shadow-[0_-10px_40px_rgba(0,0,0,.5)] transition-transform duration-500 ${i % 2 ? "translate-y-6 group-hover:translate-y-3" : "group-hover:-translate-y-2"}`}
                />
              ))}
            </div>
          </Link>
        </Reveal>}

        <PremiumTemplatesSection filter={filter} shots={shots} />

        <StoreSetsSection filter={filter} shots={shots} />

        {showPost && <Reveal>
          <section className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-[#101116]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-300">
                  <Link2 size={18} />
                </div>
                <h2 className="mt-5 text-[26px] font-semibold leading-tight sm:text-[34px]">Turn any post URL into a polished graphic.</h2>
                <p className="mt-3 max-w-lg text-[14px] leading-6 text-zinc-400">
                  One workflow for X, Bluesky, Threads, LinkedIn and Mastodon. Paste once, then edit the copy, author, metrics, card size and background.
                </p>
                <form
                  className="mt-7 flex max-w-xl gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    openPost();
                  }}
                >
                  <input
                    value={postUrl}
                    onChange={(event) => setPostUrl(event.target.value)}
                    placeholder="Paste a public post URL"
                    aria-label="Public post URL"
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/60"
                  />
                  <button type="submit" aria-label="Create post graphic" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-zinc-950 transition-colors hover:bg-cyan-100">
                    <ArrowRight size={19} />
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-zinc-500">
                  <span className="inline-flex items-center gap-1.5"><SocialBrandIcon brand="x" size={15} className="rounded-[3px] bg-white" />X</span>
                  <span>Bluesky</span>
                  <span className="inline-flex items-center gap-1.5"><SocialBrandIcon brand="threads" size={15} className="rounded-[3px] bg-white" />Threads</span>
                  <span className="inline-flex items-center gap-1.5"><SocialBrandIcon brand="linkedin" size={15} />LinkedIn</span>
                  <span>Mastodon</span>
                </div>
              </div>

              <button
                type="button"
                onClick={openPost}
                className="group relative min-h-[420px] overflow-hidden border-t border-white/10 text-left lg:border-l lg:border-t-0"
                style={{
                  backgroundColor: "#82b5e8",
                  backgroundImage: "repeating-linear-gradient(45deg,rgba(220,238,255,.25) 0 26px,transparent 26px 92px)",
                }}
              >
                {postPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={postPreview} alt="Editable post card preview" className="absolute left-1/2 top-1/2 w-[78%] max-w-[620px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_24px_30px_rgba(19,47,75,.28)] transition-transform duration-300 group-hover:-translate-y-[52%]" />
                )}
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-[#101116] px-3 py-2 text-[12px] font-semibold text-white shadow-lg">
                  Open post editor <ArrowUpRight size={14} />
                </span>
              </button>
            </div>
          </section>
        </Reveal>}

        <AppScreenTemplates filter={filter} />

        {tools.length > 0 && <>
        <Reveal>
          <div id="content-cards" className="mt-16 flex scroll-mt-24 flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Content cards</p>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Data, code and store cards</h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-zinc-500">No device needed. Edit every number, name and colour, then drop the card into any composition.</p>
          </div>
        </Reveal>
        <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((template) => {
            const previewUrl = templatePreviewUrl(template);
            const look = CARD_LOOKS[template.app ?? "code"];
            return (
              <RevealItem key={template.slug}>
                <Link
                  href={`/templates/${template.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-[#101116] transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/25"
                >
                  <div className="relative flex h-64 items-center justify-center overflow-hidden p-7" style={{ background: look.css }}>
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={`${template.label} template preview`} className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.28)] transition-transform duration-500 group-hover:scale-[1.035]" />
                    ) : null}
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-white/[0.08] p-4">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold">{template.label}</h3>
                      <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">{template.blurb}</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition-colors group-hover:border-white/30 group-hover:text-white">
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
        </>}

        {shownGroups.length > 0 && <>
        <Reveal>
          <div id="device-scenes" className="mt-16 flex scroll-mt-24 items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Device scenes</p>
              <h2 className="mt-1 text-[24px] font-semibold">Photoreal mockups by device</h2>
            </div>
            <Link href="/mockups" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white">Browse all mockups <ArrowRight size={14} /></Link>
          </div>
        </Reveal>
        <RevealGroup className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shownGroups.map((group) => {
            const previewUrl = groupPreviewUrl(group.id);
            const mine = groupScenes[group.id];
            const count = scenesInGroup(group.id).length;
            return (
              <RevealItem key={group.id}>
                <Link href={`/templates/collection/${group.id}`} className="group block overflow-hidden rounded-lg border border-white/10 bg-[#101116] transition-colors hover:border-white/25">
                  <div className="flex h-60 items-center justify-center overflow-hidden p-7" style={{ background: `radial-gradient(circle at 50% 22%, ${group.accent}38, #111218 72%)` }}>
                    {mine ? (
                      <LiveScene scene={mine} label={`${group.label} mockup with your screenshot`} className="h-full w-[82%] drop-shadow-[0_18px_28px_rgba(0,0,0,.5)] transition-transform duration-300 group-hover:scale-[1.025]" />
                    ) : previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={group.label} className="max-h-full max-w-[82%] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.5)] transition-transform duration-300 group-hover:scale-[1.025]" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-white/[0.08] p-4">
                    <div>
                      <h3 className="text-[15px] font-semibold">{group.label}</h3>
                      <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">{group.blurb}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-zinc-500">{count} {count === 1 ? "scene" : "scenes"}</span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
        </>}
      </section>

      <MarketingFooter />
    </main>
  );
}
