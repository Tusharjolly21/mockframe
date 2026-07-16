import { Composition } from "remotion";
import type { PromoInputProps } from "../../lib/promo/inputProps";
import { FORMAT_DIMENSIONS, PROMO_FPS } from "../../lib/promo/types";
import { PROMO_TEMPLATES } from "../../lib/promo/registry";
import { PROMO_COMPONENTS } from "./templates";

const DEFAULT_DIMS = FORMAT_DIMENSIONS["9:16"];

const PLACEHOLDER_SHOT =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";

/** Registered compositions for the Lambda render site and `npx remotion` tooling.
 *  The in-editor preview drives <Player> with the same components directly, so
 *  this Root is only used for server rendering. `calculateMetadata` lets one
 *  registration render at any chosen format by reading width/height from props. */
export function RemotionRoot() {
  return (
    <>
      {PROMO_TEMPLATES.map((t) => {
        const Component = PROMO_COMPONENTS[t.id];
        return (
          <Composition
            key={t.id}
            id={t.id}
            component={Component}
            fps={PROMO_FPS}
            durationInFrames={t.defaultDurationInFrames}
            width={DEFAULT_DIMS.width}
            height={DEFAULT_DIMS.height}
            calculateMetadata={({ props }) => ({
              width: props.width || DEFAULT_DIMS.width,
              height: props.height || DEFAULT_DIMS.height,
            })}
            defaultProps={
              {
                screenshotUrl: PLACEHOLDER_SHOT,
                texts: t.textSlots.map((slot) => slot.placeholder),
                accent: t.defaultAccent,
                background: t.defaultBackground,
                watermark: false,
                musicUrl: null,
                width: DEFAULT_DIMS.width,
                height: DEFAULT_DIMS.height,
              } satisfies PromoInputProps
            }
          />
        );
      })}
    </>
  );
}
