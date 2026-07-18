import rss from "@astrojs/rss";
import { getCatalog } from "../lib/movies.js";

export async function GET(context) {
  const catalog = await getCatalog();

  return rss({
    title: "Zovex Catalog — עדכוני קטלוג",
    description: "עדכונים אחרונים בקטלוג הסרטים, הסדרות והאנימה.",
    site: context.site,
    items: catalog.slice(0, 100).map((item) => ({
      title: `${item.title}${item.year ? ` (${item.year})` : ""}`,
      description: item.description || "",
      link: `/${item.slug}`,
      pubDate: item.createdDate ? new Date(item.createdDate) : undefined,
      categories: item.category ? [item.category] : [],
    })),
    customData: `<language>he</language>`,
  });
}
