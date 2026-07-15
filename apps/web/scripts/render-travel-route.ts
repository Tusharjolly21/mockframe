import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { TravelProject } from "../features/travel-route/types/travel-project.types";

export async function renderTravelVideo(project: TravelProject, outputPath: string) {
  let entryPoint = path.resolve(process.cwd(), "remotion/index.ts");
  if (!fs.existsSync(entryPoint)) {
    entryPoint = path.resolve(process.cwd(), "apps/web/remotion/index.ts");
  }

  const bundleLocation = await bundle({
    entryPoint,
  });

  const inputProps = {
    project,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "TravelRoute",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
  });
}
