import type { TravelTimelineSegment } from "./build-timeline";

export interface ResolvedTimelineState {
  routeProgress: number;
  activeCheckpointId: string | null;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function resolveTimeline(
  segments: TravelTimelineSegment[],
  currentTimeSeconds: number
): ResolvedTimelineState {
  let cursor = 0;

  for (const segment of segments) {
    const segmentEnd = cursor + segment.durationSeconds;

    if (currentTimeSeconds <= segmentEnd) {
      const localTime = Math.max(0, currentTimeSeconds - cursor);

      if (segment.type === "checkpoint-pause") {
        return {
          routeProgress: segment.routeProgress,
          activeCheckpointId: segment.checkpointId,
        };
      }

      const rawProgress = segment.durationSeconds === 0 ? 1 : localTime / segment.durationSeconds;
      const easedProgress = smoothstep(Math.min(1, rawProgress));

      return {
        routeProgress: segment.startProgress + (segment.endProgress - segment.startProgress) * easedProgress,
        activeCheckpointId: null,
      };
    }

    cursor = segmentEnd;
  }

  return {
    routeProgress: 1,
    activeCheckpointId: null,
  };
}
