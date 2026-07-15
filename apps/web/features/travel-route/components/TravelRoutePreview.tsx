"use client";

import { useEffect, useState } from "react";
import type { TravelProject } from "../types/travel-project.types";

interface Props {
  project: TravelProject;
}

export function TravelRoutePreview({ project }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center bg-[#1e1e24] aspect-[9/16] rounded-2xl border border-[#e4e4ec] text-[#9a9aa4] text-xs">
        Loading preview workspace...
      </div>
    );
  }

  // Require Remotion player safely inside mount guard
  const { Player } = require("@remotion/player");
  const { TravelRouteComposition } = require("@/remotion/TravelRouteComposition");

  const durationInFrames = Math.ceil(project.animation.durationSeconds * project.animation.fps);

  return (
    <div className="w-full bg-[#1e1e24] p-4 rounded-2xl border border-[#e4e4ec] shadow-sm flex items-center justify-center">
      <div className="w-full max-w-[340px] aspect-[9/16] overflow-hidden rounded-xl border border-white/10 shadow-2xl relative">
        <Player
          component={TravelRouteComposition}
          inputProps={{ project }}
          durationInFrames={durationInFrames}
          fps={project.animation.fps}
          compositionWidth={project.output.width}
          compositionHeight={project.output.height}
          controls
          loop
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
