import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Hourly job: clear any `bumped_at` on listings that have no matching paid bump payment.
// The DB function `reconcile_bumps()` does the work and logs `reconciled` audit rows.
export const Route = createFileRoute("/api/public/cron/reconcile-bumps")({
  server: {
    handlers: {
      POST: async () => {
        const { data, error } = await supabaseAdmin.rpc("reconcile_bumps");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const cleared = Array.isArray(data) ? data.length : 0;
        return new Response(
          JSON.stringify({ ok: true, cleared, listings: data ?? [] }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
