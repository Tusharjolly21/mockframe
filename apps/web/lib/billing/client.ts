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
 * Start a purchase: the server creates a Dodo Payments checkout session and
 * we open it as an overlay on top of the current page, so the buyer never
 * leaves their work. After payment Dodo navigates to /editor?upgrade=success,
 * where confirmCheckoutReturn() unlocks Pro (the editor autosaves, so the
 * scene is offered back there). If the overlay can't load, we fall back to
 * the full-page hosted checkout.
 *
 * `expectedPrice` is the cents price the UI DISPLAYED — the server rejects the
 * checkout if its current price differs, so a stale tab can never charge a
 * price the user didn't see. Resolves when the buyer closes the overlay
 * without paying; never resolves while a redirect is under way.
 */
export async function purchasePlan(plan: PlanId, expectedPrice: number): Promise<void> {
  const res = await firebaseFetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, expectedPrice }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || typeof j.checkoutUrl !== "string") throw new Error(j.error ?? "Checkout failed");
  const checkoutUrl: string = j.checkoutUrl;
  const mode = j.mode === "live" ? "live" : "test";

  const redirect = async (): Promise<never> => {
    window.location.assign(checkoutUrl);
    // keep the caller's busy state until the page unloads
    return new Promise<never>(() => {});
  };

  let DodoPayments: (typeof import("dodopayments-checkout"))["DodoPayments"];
  try {
    ({ DodoPayments } = await import("dodopayments-checkout"));
  } catch {
    return redirect();
  }

  let navigating = false;
  const outcome = await new Promise<"closed" | "failed">((resolve) => {
    try {
      DodoPayments.Initialize({
        mode,
        displayType: "overlay",
        onEvent: (event) => {
          if (event.event_type === "checkout.redirect") navigating = true; // the SDK navigates to the return URL
          if (event.event_type === "checkout.error" && !navigating) resolve("failed");
          if (event.event_type === "checkout.closed" && !navigating) resolve("closed");
        },
      });
      DodoPayments.Checkout.open({ checkoutUrl });
    } catch {
      resolve("failed");
    }
  });
  if (outcome === "failed") {
    try {
      DodoPayments.Checkout.close();
    } catch {}
    return redirect();
  }
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
