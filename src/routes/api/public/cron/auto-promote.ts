import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Auto-promote/renew: for any active listing with auto_renew = true that
// expires within the next 24 hours, bump it and extend expiry by 30 days.
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

  const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("listings")
    .select("id, user_id, title")
    .eq("status", "active")
    .eq("auto_renew", true)
    .lte("expires_at", horizon);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) {
    return new Response(JSON.stringify({ ok: true, promoted: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("listings")
    .update({ expires_at: nextExpiry, bumped_at: nowIso })
    .in("id", ids);

  const notifs = (rows ?? []).map((r) => ({
    user_id: r.user_id,
    type: "auto_promoted",
    title: "Listing auto-renewed",
    body: `"${r.title}" was bumped and extended for 30 more days.`,
    link: "/my-listings",
    metadata: { listing_id: r.id },
  }));
  if (notifs.length) await supabaseAdmin.from("notifications").insert(notifs);

  return new Response(JSON.stringify({ ok: true, promoted: ids.length }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const Route = createFileRoute("/api/public/cron/auto-promote")({
  server: { handlers: { GET: run, POST: run } },
});
