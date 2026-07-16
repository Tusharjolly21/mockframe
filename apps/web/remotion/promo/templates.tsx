import type { FC } from "react";
import type { PromoInputProps } from "../../lib/promo/inputProps";
import { PROMO_TEMPLATE_IDS } from "../../lib/promo/registry";
import { RiseReveal } from "./compositions/RiseReveal";
import { SpinShowcase } from "./compositions/SpinShowcase";
import { FeaturePop } from "./compositions/FeaturePop";
import { ScrollStory } from "./compositions/ScrollStory";
import { TiltParallax } from "./compositions/TiltParallax";
import { QuickCut } from "./compositions/QuickCut";

/** One component per registry id. Used by the <Player> preview (client) and the
 *  Remotion Root (Lambda/CLI). Keys are validated against the registry at module
 *  load so a missing or extra composition fails fast rather than silently. */
export const PROMO_COMPONENTS: Record<string, FC<PromoInputProps>> = {
  "rise-reveal": RiseReveal,
  "spin-showcase": SpinShowcase,
  "feature-pop": FeaturePop,
  "scroll-story": ScrollStory,
  "tilt-parallax": TiltParallax,
  "quick-cut": QuickCut,
};

for (const id of PROMO_TEMPLATE_IDS) {
  if (!PROMO_COMPONENTS[id]) throw new Error(`Missing promo composition for template "${id}"`);
}
for (const id of Object.keys(PROMO_COMPONENTS)) {
  if (!PROMO_TEMPLATE_IDS.includes(id)) throw new Error(`Promo composition "${id}" has no registry entry`);
}
