import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LngLatSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const RequestSchema = z.object({
  start: LngLatSchema,
  destination: LngLatSchema,
  checkpoints: z.array(LngLatSchema).max(20),
});

interface OsrmResponse {
  code: string;
  routes?: Array<{
    geometry: {
      type: "LineString";
      coordinates: Array<[number, number]>;
    };
    distance: number;
    duration: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = RequestSchema.parse(await request.json());
    const locations = [body.start, ...body.checkpoints, body.destination];
    const coordinateString = locations.map(([longitude, latitude]) => `${longitude},${latitude}`).join(";");

    const baseUrl = process.env.ROUTING_BASE_URL ?? "https://router.project-osrm.org";
    const routeUrl = `${baseUrl}/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(routeUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Routing provider failed." },
        { status: 502 }
      );
    }

    const result = (await response.json()) as OsrmResponse;
    const route = result.routes?.[0];

    if (result.code !== "Ok" || !route) {
      return NextResponse.json(
        { error: "No route was found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      coordinates: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 }
    );
  }
}
