import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { TravelProjectSchema } from "@/features/travel-route/schemas/travel-project.schema";
import { renderTravelVideo } from "@/scripts/render-travel-route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const project = TravelProjectSchema.parse(await request.json());

    // Generate output filename
    const filename = `travel-${Math.random().toString(36).substring(2, 11)}.mp4`;

    // Ensure public/renders directory exists
    let publicRendersDir = path.resolve(process.cwd(), "public/renders");
    if (!fs.existsSync(publicRendersDir)) {
      publicRendersDir = path.resolve(process.cwd(), "apps/web/public/renders");
    }

    if (!fs.existsSync(publicRendersDir)) {
      fs.mkdirSync(publicRendersDir, { recursive: true });
    }

    const outputPath = path.join(publicRendersDir, filename);

    await renderTravelVideo(project, outputPath);

    return NextResponse.json({
      url: `/renders/${filename}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Render failed." },
      { status: 500 }
    );
  }
}
