export type TravelTimelineSegment =
  | {
      type: "travel";
      startProgress: number;
      endProgress: number;
      durationSeconds: number;
    }
  | {
      type: "checkpoint-pause";
      checkpointId: string;
      routeProgress: number;
      durationSeconds: number;
    };

interface TimelineCheckpoint {
  id: string;
  routeProgress: number;
  pauseDurationSeconds: number;
}

export function buildTravelTimeline(
  checkpoints: TimelineCheckpoint[],
  totalDurationSeconds: number
): TravelTimelineSegment[] {
  const orderedCheckpoints = [...checkpoints]
    .filter((checkpoint) => checkpoint.routeProgress > 0 && checkpoint.routeProgress < 1)
    .sort((first, second) => first.routeProgress - second.routeProgress);

  const totalPauseDuration = orderedCheckpoints.reduce(
    (total, checkpoint) => total + checkpoint.pauseDurationSeconds,
    0
  );

  const totalTravelDuration = Math.max(0.1, totalDurationSeconds - totalPauseDuration);
  const segments: TravelTimelineSegment[] = [];
  let previousProgress = 0;

  for (const checkpoint of orderedCheckpoints) {
    const distanceShare = checkpoint.routeProgress - previousProgress;

    segments.push({
      type: "travel",
      startProgress: previousProgress,
      endProgress: checkpoint.routeProgress,
      durationSeconds: totalTravelDuration * distanceShare,
    });

    if (checkpoint.pauseDurationSeconds > 0) {
      segments.push({
        type: "checkpoint-pause",
        checkpointId: checkpoint.id,
        routeProgress: checkpoint.routeProgress,
        durationSeconds: checkpoint.pauseDurationSeconds,
      });
    }

    previousProgress = checkpoint.routeProgress;
  }

  segments.push({
    type: "travel",
    startProgress: previousProgress,
    endProgress: 1,
    durationSeconds: totalTravelDuration * (1 - previousProgress),
  });

  return segments;
}
