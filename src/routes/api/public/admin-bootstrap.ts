import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/admin-bootstrap
 *
 * Two modes, both token-gated (x-seed-token = SUPABASE_SERVICE_ROLE_KEY):
 *   - action=wipe-users  -> deletes every auth.users row via admin API
 *   - action=promote-first (default) -> if no admin exists, promotes the FIRST
 *     signed-up user to admin. No-op once any admin exists.
 *
 * This is a production-bootstrap helper. Delete this file after you've
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

        const url = new URL(request.url);
        const action = url.searchParams.get("action") ?? "promote-first";

        if (action === "wipe-users") {
          const deleted: string[] = [];
          let page = 1;
          // Paginate; deleting shifts the list, so always read page 1.
          for (let i = 0; i < 50; i++) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
            if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
            if (!data.users.length) break;
            for (const u of data.users) {
              const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
              if (!delErr) deleted.push(u.email ?? u.id);
            }
          }
          return Response.json({ ok: true, deleted_count: deleted.length, deleted });
        }

        if (action === "promote-first") {
          const { count } = await supabaseAdmin
            .from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
          if ((count ?? 0) > 0) {
            return Response.json({ ok: true, message: "Admin already exists; no-op." });
          }
          const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
          const first = data?.users[0];
          if (!first) return Response.json({ ok: false, error: "No users to promote." }, { status: 404 });
          const { error } = await supabaseAdmin
            .from("user_roles").insert({ user_id: first.id, role: "admin" });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          return Response.json({ ok: true, promoted: first.email, user_id: first.id });
        }

        return Response.json({ ok: false, error: "Unknown action." }, { status: 400 });
      },
      GET: async () => new Response("POST only.", { status: 405 }),
    },
  },
});
