import { createFileRoute } from "@tanstack/react-router";
import { runSeedDemo, hasAnyAdmin } from "@/lib/seed-demo.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * POST /api/public/seed-demo
 *
 * Creates demo + admin accounts (idempotent) and seeds sample listings.
 * Rotates passwords on every call — response contains the freshly generated
 * passwords. Do not log them.
 *
 * Auth:
 *   - With `x-seed-token` header matching SUPABASE_SERVICE_ROLE_KEY: always allowed.
 *   - Without token: allowed ONLY in bootstrap mode — when no admin role exists
 *     in the database yet. Once an admin exists, the token is required.
 */
export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-seed-token");
        const tokenValid = !!token && token === process.env.SUPABASE_SERVICE_ROLE_KEY;
        let via: "token" | "bootstrap" = "token";

        if (!tokenValid) {
          const adminExists = await hasAnyAdmin();
          if (adminExists) {
            return new Response("Unauthorized: admin already exists, x-seed-token required", { status: 401 });
          }
          via = "bootstrap";
        }

        try {
          const result = await runSeedDemo();
          await supabaseAdmin.from("audit_log").insert({
            actor_id: null,
            action: "demo.seed_rotate.public",
            target_type: "auth",
            target_id: null,
            metadata: {
              via,
              rotated_at: result.rotated_at,
              accounts: result.accounts.map(a => ({
                email: a.email,
                was_created: a.was_created,
                listings_seeded: a.listings_seeded,
              })),
            } as never,
          });
          return Response.json(result);
        } catch (e: any) {
          console.error("seed-demo error:", e);
          return new Response(JSON.stringify({ ok: false, error: e.message }), {
            status: 500, headers: { "content-type": "application/json" },
          });
        }
      },
      GET: async () => new Response("Use POST with x-seed-token header.", { status: 405 }),
    },
  },
});
