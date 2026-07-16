import { Composition } from "remotion";
import { MockupAnimationComposition } from "./MockupAnimationComposition";

export function RemotionRoot() {
  return (
    <Composition
      id="MockupAnimation"
      component={MockupAnimationComposition}
      fps={30}
      width={1280}
      height={720}
      durationInFrames={120} // 4 seconds at 30 fps
      defaultProps={{
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        backgroundColor: "#0f172a",
        tiltAngle: 12,
      }}
    />
  );
}
