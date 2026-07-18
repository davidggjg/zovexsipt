export function GET({ site }) {
  const base = site?.toString().replace(/\/$/, "") || "";
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap-index.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
