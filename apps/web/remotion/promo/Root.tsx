import { Composition, staticFile } from "remotion";
import type { PromoInputProps } from "../../lib/promo/inputProps";
import { FORMAT_DIMENSIONS, PROMO_FPS } from "../../lib/promo/types";
import { PROMO_TEMPLATES } from "../../lib/promo/registry";
import { PROMO_COMPONENTS } from "./templates";

const DEFAULT_DIMS = FORMAT_DIMENSIONS["9:16"];

// Local sample screens so `npx remotion` tooling/previews render something real.
const PLACEHOLDER_SHOTS = [
  { url: staticFile("screens/iphone-16-pro.jpg"), width: 828, height: 1800 },
  { url: staticFile("screens/iphone-16.jpg"), width: 830, height: 1800 },
  { url: staticFile("screens/pixel-9-pro.jpg"), width: 806, height: 1800 },
];

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
                deviceId: "iphone-16-pro",
                screenshots: PLACEHOLDER_SHOTS,
                texts: t.textSlots.map((slot) => slot.placeholder),
                accent: t.defaultAccent,
                background: t.defaultBackground,
                pattern: null,
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
