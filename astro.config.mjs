import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Real deployed Netlify domain. Override via env var only if it ever moves
// to a custom domain - it MUST be correct for the sitemap, canonical tags
// and RSS feed to be valid.
export const SITE_URL = process.env.SITE_URL || "https://zovex1.netlify.app";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  // build.format below is "directory" (every route -> /route/index.html),
  // so the URL that actually returns 200 directly always has a trailing
  // slash. Keeping this in sync avoids an unnecessary 301 redirect between
  // the canonical/sitemap URL and what the server actually serves.
  trailingSlash: "always",
  integrations: [
    sitemap({
      changefreq: "daily",
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  build: {
    format: "directory",
  },
});
