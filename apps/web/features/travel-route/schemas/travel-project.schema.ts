import { z } from "zod";

export const LngLatSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const TravelLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  coordinates: LngLatSchema,
});

export const TravelCheckpointSchema = TravelLocationSchema.extend({
  routingMode: z.enum(["required-stop", "visual-only"]),
  type: z.enum(["city", "state", "border", "landmark", "custom"]),
  pauseDurationSeconds: z.number().min(0).max(20),
  animation: z.object({
    showLabel: z.boolean(),
    cameraZoom: z.boolean(),
    pulse: z.boolean(),
  }),
});

export const TravelProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  start: TravelLocationSchema.nullable(),
  destination: TravelLocationSchema.nullable(),
  checkpoints: z.array(TravelCheckpointSchema),
  transportMode: z.enum(["car", "flight", "train", "boat", "bike"]),
  route: z
    .object({
      coordinates: z.array(LngLatSchema).min(2),
      distanceMeters: z.number().nonnegative(),
      durationSeconds: z.number().nonnegative().optional(),
    })
    .nullable(),
  animation: z.object({
    durationSeconds: z.number().min(3).max(180),
    fps: z.number().int().min(24).max(60),
    cameraMode: z.enum(["overview", "follow", "cinematic"]),
  }),
  vehicle: z.object({
    assetUrl: z.string(),
    scale: z.number().positive(),
  }),
  routeStyle: z.object({
    width: z.number().min(1).max(30),
    completedColor: z.string(),
    remainingColor: z.string(),
  }),
  checkpointStyle: z.object({
    markerStyle: z.enum(["dot", "pin", "flag", "numbered"]),
    showNames: z.boolean(),
  }),
  output: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});
