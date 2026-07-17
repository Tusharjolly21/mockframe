import { AI_FREE_GENERATIONS } from "./plan";

/** Pure entitlement matrix for AI generations: 2 free for real sign-ins, then
 *  Pro (Pro's daily quota is enforced separately in the route). */
export type AiGateVerdict = { allowed: true } | { allowed: false; reason: "signin" | "pro" };

export function aiGenerationDecision(opts: {
  signedIn: boolean;
  isPro: boolean;
  priorGenerations: number;
}): AiGateVerdict {
  if (!opts.signedIn) return { allowed: false, reason: "signin" };
  if (opts.isPro) return { allowed: true };
  if (opts.priorGenerations < AI_FREE_GENERATIONS) return { allowed: true };
  return { allowed: false, reason: "pro" };
}
