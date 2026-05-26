import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE = "https://callescort24.org";

export const Route = createFileRoute("/api/public/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ data: listings }, { data: categories }, { data: cities }] = await Promise.all([
          supabaseAdmin.from("listings").select("id, slug, updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(5000),
          supabaseAdmin.from("categories").select("slug"),
          supabaseAdmin.from("cities").select("slug, country"),
        ]);
        const urls: string[] = [
          `<url><loc>${BASE}/</loc><priority>1.0</priority></url>`,
          `<url><loc>${BASE}/search</loc><priority>0.8</priority></url>`,
        ];
        (categories ?? []).forEach((c) => urls.push(`<url><loc>${BASE}/search?category=${c.slug}</loc><priority>0.6</priority></url>`));
        (cities ?? []).forEach((c) => urls.push(`<url><loc>${BASE}/search?country=${c.country}&amp;city=${c.slug}</loc><priority>0.5</priority></url>`));
        (listings ?? []).forEach((l: any) => urls.push(`<url><loc>${BASE}/listings/${l.slug ?? l.id}</loc><lastmod>${new Date(l.updated_at).toISOString()}</lastmod><priority>0.7</priority></url>`));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
