import { Composition } from "remotion";
import { TravelRouteComposition } from "./TravelRouteComposition";
import { sampleProject } from "./sample-project";

export function RemotionRoot() {
  return (
    <Composition
      id="TravelRoute"
      component={TravelRouteComposition as any}
      fps={sampleProject.animation.fps}
      width={sampleProject.output.width}
      height={sampleProject.output.height}
      durationInFrames={Math.ceil(sampleProject.animation.durationSeconds * sampleProject.animation.fps)}
      defaultProps={{
        project: sampleProject,
      }}
    />
  );
}
