/**
 * Pack-export entitlement: signed-in users get ONE free, unwatermarked pack;
 * after that it's Pro. Pure so the count/plan matrix is unit-testable — the
 * route supplies the inputs and enforces this server-side (client gates are
 * a courtesy, per lib/billing/gate.ts).
 */

export type PackExportVerdict =
  | { allowed: true; clean: boolean }
  | { allowed: false; reason: "signin" | "pro" };

export function packExportDecision(opts: {
  /** Non-anonymous authenticated user — the caller must exclude Firebase
   *  anonymous-provider sessions (guests) before setting this true. */
  signedIn: boolean;
  isPro: boolean;
  priorExports: number;
}): PackExportVerdict {
  if (!opts.signedIn) return { allowed: false, reason: "signin" };
  if (opts.isPro) return { allowed: true, clean: true };
  if (opts.priorExports === 0) return { allowed: true, clean: true };
  return { allowed: false, reason: "pro" };
}
