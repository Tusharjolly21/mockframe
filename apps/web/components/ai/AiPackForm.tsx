"use client";

import { useEffect, useRef, useState } from "react";
import { firebaseFetch } from "@/lib/firebaseClient";
import { savePack } from "@/lib/pack/persist";
import type { PackDocument } from "@/lib/pack/schema";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { useEntitlementSync } from "@/lib/billing/client";
import { ICON_VIEWBOX, iconBody } from "@/lib/iconStickers";

const UPGRADE_REASON = "AI-generated screenshot packs";

const APP_NAME_MAX = 60;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 600;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const LOADING_MESSAGES = ["Designing your narrative…", "Writing captions…", "Painting concept screens…"] as const;
const LOADING_ROTATE_MS = 6000;

type Status = "idle" | "loading" | "success" | "error";

interface SuccessState {
  remaining: number | null;
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
  const [status, setStatus] = useState<Status>("idle");
  const [messageIndex, setMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (rotateRef.current) clearInterval(rotateRef.current);
    };
  }, []);

  const trimmedName = appName.trim();
  const trimmedDescription = description.trim();
  const accentValid = accent.trim() === "" || HEX_COLOR.test(accent.trim());
  const nameValid = trimmedName.length > 0 && trimmedName.length <= APP_NAME_MAX;
  const descriptionValid = trimmedDescription.length >= DESCRIPTION_MIN && trimmedDescription.length <= DESCRIPTION_MAX;
  const formValid = nameValid && descriptionValid && accentValid;

  async function submit() {
    if (!formValid || status === "loading") return;
    setStatus("loading");
    setErrorMessage(null);
    setMessageIndex(0);
    rotateRef.current = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, LOADING_ROTATE_MS);

    try {
      const res = await firebaseFetch("/api/ai-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: trimmedName,
          description: trimmedDescription,
          ...(accent.trim() ? { accent: accent.trim() } : {}),
        }),
      });

      if (res.status === 200) {
        const json = (await res.json()) as { pack: unknown; remaining: number | null };
        await savePack(json.pack as PackDocument);
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
            <label htmlFor="ai-description" className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              What does it do?
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
              <span className={trimmedDescription.length > 0 && !descriptionValid ? "text-amber-400" : "text-white/30"}>
                {trimmedDescription.length < DESCRIPTION_MIN
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
              <p className="text-[12px] font-medium text-white/60">{LOADING_MESSAGES[messageIndex]}</p>
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
