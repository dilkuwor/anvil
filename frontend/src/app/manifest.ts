import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/**
 * Lets Anvil be installed as an app, which is also what gives it its own window and a start
 * address the offline worker can serve from its cache.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    // Opens on the dashboard rather than the marketing page, which is what an installed app wants.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0e0e11",
    theme_color: "#0e0e11",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
