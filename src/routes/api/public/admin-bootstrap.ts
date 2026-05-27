import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/admin-bootstrap
 *
 * One-shot helper for production launch.
 * Token-gated: requires header `x-seed-token: <SUPABASE_SERVICE_ROLE_KEY>`.
 *
 * If no admin exists yet, promotes the FIRST signed-up user to admin.
 * No-op once any admin exists. Safe to delete this file after you've
 * created your admin account.
 */
export const Route = createFileRoute("/api/public/admin-bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-seed-token");
        if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { count } = await supabaseAdmin
          .from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
        if ((count ?? 0) > 0) {
          return Response.json({ ok: true, message: "Admin already exists; no-op." });
        }

        const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (listErr) return Response.json({ ok: false, error: listErr.message }, { status: 500 });
        const first = data?.users[0];
        if (!first) return Response.json({ ok: false, error: "Sign up a user first." }, { status: 404 });

        const { error } = await supabaseAdmin
          .from("user_roles").insert({ user_id: first.id, role: "admin" });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, promoted: first.email, user_id: first.id });
      },
      GET: async () => new Response("POST only.", { status: 405 }),
    },
  },
});
