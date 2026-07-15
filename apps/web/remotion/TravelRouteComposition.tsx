import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { TravelProject } from "@/features/travel-route/types/travel-project.types";
import { buildTravelTimeline } from "@/features/travel-route/engine/build-timeline";
import { resolveTimeline } from "@/features/travel-route/engine/resolve-timeline";
import { TravelMap } from "@/features/travel-route/map/TravelMap";

interface Props {
  project: TravelProject;
}

export function TravelRouteComposition({ project }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeSeconds = frame / fps;

  const timeline = buildTravelTimeline(
    project.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      routeProgress: checkpoint.calculated?.routeProgress ?? 0,
      pauseDurationSeconds: checkpoint.pauseDurationSeconds,
    })),
    project.animation.durationSeconds
  );

  const state = resolveTimeline(timeline, currentTimeSeconds);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1e1e24" }}>
      <TravelMap
        project={project}
        routeProgress={state.routeProgress}
        activeCheckpointId={state.activeCheckpointId}
      />

      {state.activeCheckpointId && (
        <CheckpointArrivalCard
          project={project}
          checkpointId={state.activeCheckpointId}
        />
      )}
    </AbsoluteFill>
  );
}

function CheckpointArrivalCard({
  project,
  checkpointId,
}: {
  project: TravelProject;
  checkpointId: string;
}) {
  const checkpoint = project.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "5%",
        right: "5%",
        bottom: "8%",
        borderRadius: 24,
        background: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(12px)",
        padding: 24,
        color: "white",
        textAlign: "center",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8", fontWeight: 600 }}>
        Checkpoint Reached
      </div>
      <div style={{ marginTop: 6, fontSize: 32, fontWeight: 800, color: "#3b82f6" }}>
        {checkpoint.name}
      </div>
    </div>
  );
}
