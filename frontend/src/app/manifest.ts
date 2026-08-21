import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_TAGLINE} ${SITE_DESCRIPTION}`,
    start_url: "/",
    display: "standalone",
    background_color: "#18181b",
    theme_color: "#f97316",
    lang: "en",
    icons: [
      {
        src: "/logo-app-v6.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-app-v6.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
