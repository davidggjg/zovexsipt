import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Replace SITE_URL with your real Netlify domain (or custom domain) once you have it.
// It MUST be correct for the sitemap, canonical tags and RSS feed to be valid.
export const SITE_URL = process.env.SITE_URL || "https://zovex-landing.netlify.app";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "never",
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
