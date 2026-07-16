import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Web app manifest — theme color, install name, icons. Improves the mobile
// "add to home screen" experience and gives crawlers a canonical app name.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Device Mockup & Screenshot Generator`,
    short_name: SITE_NAME,
    description:
      "Turn any screenshot into a photoreal device mockup, chat or app screen, and export a share-ready image — free, in your browser.",
    start_url: "/editor",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
