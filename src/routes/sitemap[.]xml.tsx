import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE = "https://devads.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ data: categories }, { data: cities }, { data: listings }] = await Promise.all([
          supabaseAdmin.from("categories").select("slug"),
          supabaseAdmin.from("cities").select("slug").limit(500),
          supabaseAdmin.from("listings").select("id, updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(1000),
        ]);

        const urls: string[] = [
          `${BASE}/`,
          `${BASE}/search`,
          `${BASE}/login`,
          `${BASE}/signup`,
        ];
        (categories ?? []).forEach((c) => urls.push(`${BASE}/search?category=${encodeURIComponent(c.slug)}`));
        (cities ?? []).forEach((c) => urls.push(`${BASE}/search?city=${encodeURIComponent(c.slug)}`));

        const staticEntries = urls.map((u) => `  <url><loc>${u}</loc></url>`);
        const listingEntries = (listings ?? []).map(
          (l) => `  <url><loc>${BASE}/listings/${l.id}</loc><lastmod>${new Date(l.updated_at).toISOString()}</lastmod></url>`,
        );

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join("\n")}
${listingEntries.join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
