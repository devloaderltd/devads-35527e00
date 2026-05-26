import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Filters = { q?: string; category?: string; city?: string; country?: string; condition?: string };

function checkAuth(request: Request): Response | null {
  const expected = process.env.CRON_TRIGGER_SECRET;
  if (!expected) {
    return new Response("CRON_TRIGGER_SECRET not configured", { status: 500 });
  }
  const url = new URL(request.url);
  const token = request.headers.get("x-cron-secret") ?? url.searchParams.get("token");
  if (token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

const run = async ({ request }: { request: Request }) => {
  const unauthorized = checkAuth(request);
  if (unauthorized) return unauthorized;

  const { data: searches } = await supabaseAdmin
    .from("saved_searches").select("*").eq("notify", true);
  if (!searches?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });

  let notifs = 0;
  for (const s of searches) {
    const filters = (s.filters ?? {}) as Filters;
    let q = supabaseAdmin.from("listings")
      .select("id, title, category_id, city_id, categories(slug), cities(slug, country)")
      .eq("status", "active").gte("created_at", s.last_notified_at).limit(50);
    if (filters.q) q = q.textSearch("search_tsv", filters.q, { type: "websearch" });
    const { data: matches } = await q;
    const filtered = (matches ?? []).filter((m: { categories: { slug: string } | null; cities: { slug: string; country: string } | null }) => {
      if (filters.category && m.categories?.slug !== filters.category) return false;
      if (filters.city && m.cities?.slug !== filters.city) return false;
      if (filters.country && m.cities?.country !== filters.country) return false;
      return true;
    });
    if (filtered.length) {
      await supabaseAdmin.from("notifications").insert({
        user_id: s.user_id, type: "saved_search",
        title: `${filtered.length} new match${filtered.length === 1 ? "" : "es"} for "${s.name}"`,
        body: filtered.slice(0, 3).map((m: { title: string }) => m.title).join(" · "),
        link: `/saved-searches`,
        metadata: { searchId: s.id, count: filtered.length },
      });
      notifs++;
    }
    await supabaseAdmin.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id);
  }
  return new Response(JSON.stringify({ ok: true, searches: searches.length, notifs }), { headers: { "Content-Type": "application/json" } });
};

export const Route = createFileRoute("/api/public/cron/match-saved-searches")({
  server: { handlers: { GET: run, POST: run } },
});
