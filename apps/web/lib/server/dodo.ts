import type { PlanId } from "../billing/plans";
import type { DodoSubscription, PlanForProduct } from "./dodoWebhook";

/**
 * Minimal Dodo Payments REST client (plain fetch — no SDK dependency).
 * API reference: https://docs.dodopayments.com/api-reference
 *
 * Env:
 *  DODO_PAYMENTS_API_KEY         secret API key (Dashboard → Developer → API Keys)
 *  DODO_PAYMENTS_ENVIRONMENT     "test_mode" (default) | "live_mode"
 *  DODO_PRODUCT_PRO_MONTHLY      product id of the monthly subscription product
 *  DODO_PRODUCT_PRO_YEARLY       product id of the yearly subscription product
 *  DODO_PAYMENTS_WEBHOOK_SECRET  webhook signing secret (whsec_…), used by the webhook route
 */

export class DodoConfigError extends Error {
  constructor(message = "Billing is not configured") {
    super(message);
    this.name = "DodoConfigError";
  }
}

export class DodoApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "DodoApiError";
  }
}

const PRODUCT_ENV: Record<PlanId, string> = {
  monthly: "DODO_PRODUCT_PRO_MONTHLY",
  yearly: "DODO_PRODUCT_PRO_YEARLY",
};

export function isDodoConfigured(): boolean {
  return !!(process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PRODUCT_PRO_MONTHLY && process.env.DODO_PRODUCT_PRO_YEARLY);
}

export function dodoBaseUrl(): string {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export function dodoProductId(plan: PlanId): string {
  const id = process.env[PRODUCT_ENV[plan]];
  if (!id) throw new DodoConfigError();
  return id;
}

/** Reverse lookup used when an event's metadata doesn't name the plan. */
export const planForProduct: PlanForProduct = (productId) => {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_PRO_MONTHLY) return "monthly";
  if (productId === process.env.DODO_PRODUCT_PRO_YEARLY) return "yearly";
  return null;
};

async function dodoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  if (!key) throw new DodoConfigError();
  const res = await fetch(`${dodoBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new DodoApiError(res.status, `Dodo ${init.method ?? "GET"} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface CheckoutSessionInput {
  plan: PlanId;
  uid: string;
  email?: string | null;
  name?: string | null;
  returnUrl: string;
  cancelUrl?: string;
}

/** POST /checkouts → hosted checkout URL. uid + plan travel in metadata, which
 *  Dodo copies onto the resulting subscription/payment so webhooks can
 *  attribute the purchase without a browser session. */
export async function createCheckoutSession(input: CheckoutSessionInput): Promise<{ sessionId: string; checkoutUrl: string }> {
  const body: Record<string, unknown> = {
    product_cart: [{ product_id: dodoProductId(input.plan), quantity: 1 }],
    return_url: input.returnUrl,
    metadata: { uid: input.uid, plan: input.plan },
  };
  if (input.cancelUrl) body.cancel_url = input.cancelUrl;
  if (input.email) body.customer = input.name ? { email: input.email, name: input.name } : { email: input.email };

  const res = await dodoFetch<{ session_id?: string; checkout_url?: string | null }>("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.checkout_url || !res.session_id) throw new DodoApiError(502, "Dodo checkout session has no checkout_url");
  return { sessionId: res.session_id, checkoutUrl: res.checkout_url };
}

/** GET /subscriptions/{id} */
export async function getSubscription(subscriptionId: string): Promise<DodoSubscription> {
  return dodoFetch<DodoSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/** POST /customers/{id}/customer-portal/session → a short-lived link where the customer
 *  updates their card, sees invoices and cancels. */
export async function createPortalSession(customerId: string, returnUrl?: string): Promise<string> {
  const query = returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : "";
  const res = await dodoFetch<{ link?: string }>(`/customers/${encodeURIComponent(customerId)}/customer-portal/session${query}`, { method: "POST", body: "{}" });
  if (!res.link) throw new DodoApiError(502, "Dodo portal session has no link");
  return res.link;
}
