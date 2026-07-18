"use client";

import { useEffect, useRef, useState } from "react";
import { firebaseFetch } from "@/lib/firebaseClient";
import { savePack } from "@/lib/pack/persist";
import { PackDocumentSchema } from "@/lib/pack/schema";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { useEntitlementSync } from "@/lib/billing/client";
import { ICON_VIEWBOX, iconBody } from "@/lib/iconStickers";
import { ingestFile } from "@/lib/assets";
import { downscaleForAi } from "@/lib/ai/clientImages";

const UPGRADE_REASON = "AI-generated screenshot packs";

const APP_NAME_MAX = 60;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 600;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MIN_IMAGES = 2;
const MAX_IMAGES = 10;

const CONCEPT_LOADING_MESSAGES = ["Designing your narrative…", "Writing captions…", "Painting concept screens…"] as const;
const REAL_LOADING_MESSAGES = ["Reading your screenshots…", ...CONCEPT_LOADING_MESSAGES] as const;
const LOADING_ROTATE_MS = 6000;

type Status = "idle" | "loading" | "success" | "error";

interface SuccessState {
  remaining: number | null;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

function IconifyIcon({ name, size = 20, color = "#ffffff", className = "" }: { name: string; size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} className={className} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: iconBody(name, [color]) ?? "" }} />
    </svg>
  );
}

/** Client form: describe the app, POST /api/ai-pack, save the resulting pack
 *  and hand off to the pack studio. Handles every documented response —
 *  200 success, 401 sign-in, 402 upgrade, 429/501/502 inline retry. */
export function AiPackForm() {
  useEntitlementSync();

  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [messageIndex, setMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextImageId = useRef(0);
  const imagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current);
    };
  }, []);

  // keep a live ref so the unmount cleanup below can revoke whatever object
  // URLs are current at teardown time, not just the ones from first render
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  function addImages(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const imageFiles = incoming.filter((f) => f.type.startsWith("image/"));
    const rejectedCount = incoming.length - imageFiles.length;

    const capacity = Math.max(0, MAX_IMAGES - images.length);
    const accepted = imageFiles.slice(0, capacity);
    const excessCount = imageFiles.length - accepted.length;

    const notices: string[] = [];
    if (rejectedCount > 0) notices.push(`${rejectedCount} file${rejectedCount === 1 ? "" : "s"} skipped — images only`);
    if (excessCount > 0) notices.push(`Only ${MAX_IMAGES} images allowed — ${excessCount} ignored`);
    setImageNotice(notices.length ? notices.join(". ") : null);

    if (accepted.length === 0) return;
    const entries = accepted.map((file) => ({
      id: `img-${(nextImageId.current += 1)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...entries]);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  }

  const trimmedName = appName.trim();
  const trimmedDescription = description.trim();
  const accentValid = accent.trim() === "" || HEX_COLOR.test(accent.trim());
  const nameValid = trimmedName.length > 0 && trimmedName.length <= APP_NAME_MAX;
  const hasImages = images.length > 0;
  const imagesValid = images.length === 0 || images.length >= MIN_IMAGES;
  const descriptionValid = hasImages
    ? trimmedDescription.length <= DESCRIPTION_MAX
    : trimmedDescription.length >= DESCRIPTION_MIN && trimmedDescription.length <= DESCRIPTION_MAX;
  const formValid = nameValid && descriptionValid && accentValid && imagesValid;
  const loadingMessages = hasImages ? REAL_LOADING_MESSAGES : CONCEPT_LOADING_MESSAGES;

  async function submit() {
    if (!formValid || status === "loading") return;
    setStatus("loading");
    setErrorMessage(null);
    setMessageIndex(0);
    rotateRef.current = setInterval(() => {
      setMessageIndex((i) => (i + 1) % loadingMessages.length);
    }, LOADING_ROTATE_MS);

    // Image prep runs in its own try/catch, ahead of the network try below,
    // and in two passes: pass 1 downscales every image before pass 2 ingests
    // any of them. ingestFile() has no eviction API, so ingesting-then-
    // downscaling would leave earlier full-res assets orphaned in the
    // module-level asset map if a later image failed to decode — decoding
    // everything first means a bad image aborts before anything is ingested.
    let screenshots: { refId: string; image: string }[] = [];
    if (hasImages) {
      try {
        const dataUrls = await Promise.all(images.map((entry) => downscaleForAi(entry.file)));
        screenshots = await Promise.all(
          images.map(async (entry, i) => {
            const asset = await ingestFile(entry.file);
            return { refId: asset.id, image: dataUrls[i] };
          })
        );
      } catch {
        if (rotateRef.current) {
          clearInterval(rotateRef.current);
          rotateRef.current = null;
        }
        setErrorMessage("One of your images couldn't be read — remove it and try again.");
        setStatus("error");
        return;
      }
    }

    try {
      const requestBody: Record<string, unknown> = hasImages
        ? {
            mode: "real",
            appName: trimmedName,
            ...(trimmedDescription ? { description: trimmedDescription } : {}),
            ...(accent.trim() ? { accent: accent.trim() } : {}),
            screenshots,
          }
        : {
            appName: trimmedName,
            description: trimmedDescription,
            ...(accent.trim() ? { accent: accent.trim() } : {}),
          };

      const res = await firebaseFetch("/api/ai-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 200) {
        const json = (await res.json()) as { pack: unknown; remaining: number | null };
        const parsed = PackDocumentSchema.safeParse(json.pack);
        if (!parsed.success) {
          setErrorMessage("Generation returned an unusable pack — please retry.");
          setStatus("error");
          return;
        }
        await savePack(parsed.data);
        window.open("/app-store-screenshots", "_blank");
        setSuccess({ remaining: json.remaining });
        setStatus("success");
        return;
      }
      if (res.status === 401) {
        setAuthOpen(true);
        setStatus("idle");
        return;
      }
      if (res.status === 402) {
        setUpgradeOpen(true);
        setStatus("idle");
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setErrorMessage(body?.error ?? "Generation failed — please retry.");
      setStatus("error");
    } catch {
      setErrorMessage("Couldn't reach the generation service — check your connection and retry.");
      setStatus("error");
    } finally {
      if (rotateRef.current) {
        clearInterval(rotateRef.current);
        rotateRef.current = null;
      }
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  const loading = status === "loading";

  return (
    <div className="mx-auto w-full max-w-xl rounded-[24px] border border-white/[0.08] bg-[#101014] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.45)] md:p-8">
      {status === "success" && success ? (
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10">
            <IconifyIcon name="check-circle" size={24} color="#34d399" />
          </div>
          <p className="mt-4 text-[16px] font-semibold text-white">Your pack is ready — opening the studio…</p>
          <p className="mt-2 text-[13px] leading-5 text-white/50">
            If a new tab didn&apos;t open (popup blockers), use the link below.
          </p>
          <a
            href="/app-store-screenshots"
            target="_blank"
            rel="noopener noreferrer"
            className="fk-press mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            <IconifyIcon name="widget-2" size={16} color="#17171c" /> Open the pack studio
          </a>
          {success.remaining !== null && (
            <p className="mt-4 text-[12px] text-white/40">
              {success.remaining} free generation{success.remaining === 1 ? "" : "s"} left
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setSuccess(null);
            }}
            className="fk-press mt-5 text-[12px] font-medium text-violet-400 hover:text-violet-300"
          >
            Generate another pack
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="ai-app-name" className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              App name
            </label>
            <input
              id="ai-app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value.slice(0, APP_NAME_MAX))}
              placeholder="e.g. Focusly"
              disabled={loading}
              maxLength={APP_NAME_MAX}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 disabled:opacity-50"
            />
            <div className="mt-1 flex justify-end text-[11px] text-white/30">
              {appName.length}/{APP_NAME_MAX}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              Add your real screenshots <span className="normal-case text-white/30">(optional) — 2–10 images</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!loading) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!loading && e.dataTransfer.files?.length) addImages(e.dataTransfer.files);
              }}
              className={`mt-2 rounded-lg border border-dashed px-3.5 py-3 transition ${
                dragOver ? "border-violet-400 bg-violet-400/[0.06]" : "border-white/15"
              }`}
            >
              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="fk-press flex w-full flex-col items-center justify-center gap-1.5 py-4 text-white/50 hover:text-white/70 disabled:opacity-50"
                >
                  <IconifyIcon name="gallery" size={20} color="currentColor" />
                  <span className="text-[12px]">Drag &amp; drop or click to add screenshots</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {images.map((img) => (
                    <div key={img.id} className="group relative aspect-[9/19] overflow-hidden rounded-md bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove screenshot ${img.file.name}`}
                        onClick={() => removeImage(img.id)}
                        disabled={loading}
                        className="fk-press absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[12px] leading-none text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 disabled:opacity-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      aria-label="Add more screenshots"
                      className="fk-press flex aspect-[9/19] items-center justify-center rounded-md border border-dashed border-white/20 text-[18px] text-white/40 hover:border-violet-400 hover:text-white disabled:opacity-50"
                    >
                      +
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={loading}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className={images.length === 1 ? "text-amber-400" : "text-white/30"}>
                {images.length === 1
                  ? "Add at least one more or remove it"
                  : images.length > 1
                    ? `${images.length} screenshots ready`
                    : ""}
              </span>
              {images.length > 0 && (
                <span className="text-white/30">
                  {images.length}/{MAX_IMAGES}
                </span>
              )}
            </div>
            {imageNotice && <p className="mt-1 text-[11px] text-amber-400">{imageNotice}</p>}
          </div>

          <div>
            <label htmlFor="ai-description" className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              What does it do? {hasImages && <span className="normal-case text-white/30">(optional)</span>}
            </label>
            <textarea
              id="ai-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              placeholder="Describe your app's core features and who it's for — the more detail, the better the pack."
              disabled={loading}
              rows={5}
              maxLength={DESCRIPTION_MAX}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 disabled:opacity-50"
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className={!hasImages && trimmedDescription.length > 0 && !descriptionValid ? "text-amber-400" : "text-white/30"}>
                {hasImages
                  ? "Optional — we can read your screenshots"
                  : trimmedDescription.length < DESCRIPTION_MIN
                    ? `At least ${DESCRIPTION_MIN} characters — ${DESCRIPTION_MIN - trimmedDescription.length} to go`
                    : "Looks good"}
              </span>
              <span className="text-white/30">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="ai-accent" className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              Accent color <span className="normal-case text-white/30">(optional)</span>
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="ai-accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#6d28d9"
                disabled={loading}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 disabled:opacity-50"
              />
              <span
                className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
                style={{ background: accentValid && accent.trim() ? accent.trim() : "transparent" }}
                aria-hidden
              />
            </div>
            {!accentValid && <p className="mt-1 text-[11px] text-red-300">Use a 6-digit hex color, e.g. #6d28d9.</p>}
          </div>

          {status === "error" && errorMessage && (
            <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3.5 py-3 text-[12px] leading-5 text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!formValid || loading}
            className="fk-press flex w-full items-center justify-center gap-2.5 rounded-lg bg-white py-3.5 text-[13px] font-semibold text-zinc-900 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <IconifyIcon name="refresh-circle" size={17} color="#17171c" className="animate-spin" />
            ) : (
              <IconifyIcon name="magic-stick-3" size={17} color="#17171c" />
            )}
            {status === "error" ? "Retry generation" : loading ? "Generating…" : "Generate my pack"}
          </button>

          {loading && (
            <div className="text-center">
              <p className="text-[12px] font-medium text-white/60">{loadingMessages[messageIndex]}</p>
              <p className="mt-1 text-[11px] text-white/30">This can take up to a minute — don&apos;t close this tab.</p>
            </div>
          )}
        </form>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {upgradeOpen && <UpgradeModal reason={UPGRADE_REASON} onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
