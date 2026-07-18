// src/lib/movies.js
//
// Loads the catalog from the MAIN site (movies.json) at BUILD TIME.
// This is what makes the landing site "automatic": every time this project
// is rebuilt (see .github/workflows/rebuild.yml), it re-downloads the latest
// movies.json from the main site and regenerates every page from scratch.
//
// If the live fetch fails for any reason (network hiccup during CI), we fall
// back to the bundled snapshot in public/data/movies.fallback.json so the
// build never breaks.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the main site publishes its data. Override via env var if it ever moves.
export const MAIN_SITE_URL = process.env.MAIN_SITE_URL || "https://davidggjg.github.io/zovex";
export const MOVIES_JSON_URL = process.env.MOVIES_JSON_URL || `${MAIN_SITE_URL}/movies.json`;
const MAIN_SITE_ORIGIN = new URL(MAIN_SITE_URL).origin;

// Some poster/thumbnail URLs on the main site are root-relative (e.g. live
// channel logos: "/zovex/live-logos/kan11.png"). On this separate domain a
// relative path like that would 404, so resolve it against the main site's
// origin instead of its own.
function resolveImage(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return MAIN_SITE_ORIGIN + url;
  return url;
}

let cache = null;
let liveCache = null;

async function fetchLiveCatalog() {
  const res = await fetch(MOVIES_JSON_URL, {
    headers: { "user-agent": "zovex-landing-build" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${MOVIES_JSON_URL}: ${res.status}`);
  return res.json();
}

function loadFallbackCatalog() {
  const fallbackPath = path.join(__dirname, "..", "..", "public", "data", "movies.fallback.json");
  const raw = fs.readFileSync(fallbackPath, "utf-8");
  return JSON.parse(raw);
}

async function loadRawCatalog() {
  try {
    const data = await fetchLiveCatalog();
    console.log(`[movies] loaded ${data.length} raw entries from live source: ${MOVIES_JSON_URL}`);
    return data;
  } catch (err) {
    console.warn(`[movies] live fetch failed (${err.message}); using bundled fallback snapshot`);
    return loadFallbackCatalog();
  }
}

function slugify(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Groups raw episode/movie rows by custom_slug into one "content" record per
 * title (movie OR full series), which is what gets its own landing page.
 */
function normalize(rawRows) {
  const bySlug = new Map();

  for (const row of rawRows) {
    if (!row || row.is_live) continue; // live broadcasts don't get catalog pages
    const slug = row.custom_slug || slugify(row.series_name || row.title);
    if (!slug) continue;

    const isSeries = Boolean(row.series_name) || row.season_number != null;

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        slug,
        title: row.series_name || row.title,
        description: row.description || "",
        category: row.category || "",
        year: row.year || null,
        poster: resolveImage(row.thumbnail_url),
        isSeries,
        franchise: row.franchise || null,
        createdDate: row.created_date || null,
        episodes: [],
      });
    }

    const entry = bySlug.get(slug);
    // Keep the newest description/poster/year if a later row has richer data
    if (!entry.description && row.description) entry.description = row.description;
    if (!entry.poster && row.thumbnail_url) entry.poster = resolveImage(row.thumbnail_url);
    if (!entry.year && row.year) entry.year = row.year;
    if (row.created_date && (!entry.createdDate || row.created_date > entry.createdDate)) {
      entry.createdDate = row.created_date;
    }

    if (isSeries) {
      entry.episodes.push({
        season: row.season_number || 1,
        episode: row.episode_number || 1,
        title: row.episode_title || null,
      });
    }
  }

  const list = Array.from(bySlug.values()).map((entry) => {
    if (entry.isSeries && entry.episodes.length) {
      const seasons = new Set(entry.episodes.map((e) => e.season));
      entry.seasonCount = seasons.size;
      entry.episodeCount = entry.episodes.length;
    }
    delete entry.episodes;
    return entry;
  });

  // Newest first (falls back to title sort if no date)
  list.sort((a, b) => {
    if (a.createdDate && b.createdDate) return b.createdDate.localeCompare(a.createdDate);
    return String(a.title).localeCompare(String(b.title), "he");
  });

  return list;
}

/**
 * Returns the full normalized catalog (one entry per custom_slug).
 * Cached in-memory for the duration of the build.
 */
export async function getCatalog() {
  if (cache) return cache;
  const raw = await loadRawCatalog();
  cache = normalize(raw);
  return cache;
}

export async function getBySlug(slug) {
  const catalog = await getCatalog();
  return catalog.find((c) => c.slug === slug) || null;
}

/**
 * Live broadcast channels currently active on the main site. These don't get
 * their own catalog/info page here (there's no extra info to show beyond the
 * poster) - they link straight out to the main site's live player.
 */
export async function getLiveChannels() {
  if (liveCache) return liveCache;
  const raw = await loadRawCatalog();
  liveCache = raw
    .filter((row) => row && row.is_live)
    .map((row) => ({
      title: row.title || row.name || "שידור חי",
      slug: row.custom_slug || slugify(row.title || row.name || ""),
      poster: resolveImage(row.thumbnail_url),
    }))
    .filter((ch) => ch.slug);
  return liveCache;
}

export function getCategories(catalog) {
  const set = new Set(catalog.map((c) => c.category).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}
