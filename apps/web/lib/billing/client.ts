"use client";

import { useEffect } from "react";
import { firebaseFetch } from "../firebaseClient";
import { useViewStore } from "../store";
import { useAuth } from "../auth";
import type { Currency, PlanId } from "./plans";

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

/** INR for Indian locales/timezone, USD otherwise — user can still toggle. */
export function defaultCurrency(): Currency {
  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Calcutta") return "INR";
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kolkata") return "INR";
    if (navigator.language?.toLowerCase().endsWith("-in")) return "INR";
  } catch {}
  return "USD";
}

/* ----------------------------- Razorpay checkout ----------------------------- */

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, cb: (resp: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("Failed to load Razorpay checkout"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export class CheckoutCancelled extends Error {
  constructor() {
    super("Checkout dismissed");
    this.name = "CheckoutCancelled";
  }
}

/**
 * Full purchase flow: create order/subscription server-side, open Razorpay
 * Checkout, then verify the signature server-side. Resolves once the server
 * has confirmed payment and written the entitlement.
 *
 * `expectedPrice` is the minor-unit price the UI DISPLAYED — the server
 * rejects the checkout if its current price differs, so a stale tab can
 * never charge a price the user didn't see.
 */
export async function purchasePlan(plan: PlanId, currency: Currency, expectedPrice: number): Promise<void> {
  const checkoutRes = await firebaseFetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, currency, expectedPrice }),
  });
  const checkout = await checkoutRes.json();
  if (!checkoutRes.ok) throw new Error(checkout.error ?? "Checkout failed");

  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Razorpay unavailable");

  const response = await new Promise<RazorpayHandlerResponse>((resolve, reject) => {
    const options: Record<string, unknown> = {
      key: checkout.keyId,
      name: "MockFrame",
      description: `MockFrame Pro — ${plan}`,
      theme: { color: "#17171c" },
      handler: (resp: RazorpayHandlerResponse) => resolve(resp),
      modal: { ondismiss: () => reject(new CheckoutCancelled()) },
    };
    if (checkout.mode === "order") {
      options.order_id = checkout.orderId;
      options.amount = checkout.amount;
      options.currency = checkout.currency;
    } else {
      options.subscription_id = checkout.subscriptionId;
    }
    const rzp = new window.Razorpay!(options);
    rzp.on("payment.failed", () => reject(new Error("Payment failed — try again")));
    rzp.open();
  });

  const verifyRes = await firebaseFetch("/api/billing/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, ...response }),
  });
  const verify = await verifyRes.json();
  if (!verifyRes.ok || !verify.active) throw new Error(verify.error ?? "Verification failed");
}
