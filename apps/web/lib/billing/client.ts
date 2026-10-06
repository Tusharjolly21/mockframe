"use client";

import { useEffect } from "react";
import { firebaseFetch } from "../firebaseClient";
import { useViewStore } from "../store";
import { useAuth } from "../auth";
import type { PlanId } from "./plans";

/* ------------------------- entitlement → view store ------------------------- */

/** Syncs the server-side Pro entitlement into removeWatermark on mount and
    whenever the signed-in account changes. */
export function useEntitlementSync(): void {
  const { account } = useAuth();
  const setRemoveWatermark = useViewStore((s) => s.setRemoveWatermark);
  useEffect(() => {
    let stale = false;
    firebaseFetch("/api/billing/status")
      .then((r) => r.json())
      .then((j: { active?: boolean }) => {
        if (!stale) setRemoveWatermark(!!j.active);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [account?.uid, setRemoveWatermark]);
}

/* -------------------------- Dodo Payments checkout -------------------------- */

/**
 * Start a purchase: the server creates a Dodo Payments hosted-checkout session
 * and we navigate to it. Dodo returns the buyer to /editor?upgrade=success,
 * where confirmCheckoutReturn() unlocks Pro.
 *
 * `expectedPrice` is the cents price the UI DISPLAYED — the server rejects the
 * checkout if its current price differs, so a stale tab can never charge a
 * price the user didn't see. Resolves only if navigation fails to start.
 */
export async function purchasePlan(plan: PlanId, expectedPrice: number): Promise<void> {
  const res = await firebaseFetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, expectedPrice }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || typeof j.checkoutUrl !== "string") throw new Error(j.error ?? "Checkout failed");
  window.location.assign(j.checkoutUrl);
  // keep the caller's busy state until the page unloads
  await new Promise<never>(() => {});
}

async function readStatus(): Promise<boolean> {
  try {
    const r = await firebaseFetch("/api/billing/status");
    const j = (await r.json()) as { active?: boolean };
    return !!j.active;
  } catch {
    return false;
  }
}

/**
 * After Dodo redirects back: re-check the subscription with Dodo by id (when
 * the return URL carries one), then poll /api/billing/status for a short while
 * in case the webhook is what grants Pro. Resolves to whether Pro is active.
 */
export async function confirmCheckoutReturn(subscriptionId: string | null, { attempts = 8, intervalMs = 2500 } = {}): Promise<boolean> {
  if (subscriptionId) {
    try {
      const r = await firebaseFetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const j = (await r.json()) as { active?: boolean };
      if (r.ok && j.active) return true;
    } catch {}
  }
  for (let i = 0; i < attempts; i++) {
    if (await readStatus()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
