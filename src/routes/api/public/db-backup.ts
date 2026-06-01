import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * GET /api/public/db-backup?token=SERVICE_ROLE_KEY
 *
 * Downloads a full JSON backup of the public schema + auth users metadata.
 * Token = SUPABASE_SERVICE_ROLE_KEY (already in env).
 *
 * Auth users are exported via the admin API (no password hashes — restore
 * recreates accounts and users must reset password). Public tables exported
 * row-by-row in chunks of 1000.
 */
export const Route = createFileRoute("/api/public/db-backup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-token");
        if (!token || token !== process.env.DB_BACKUP_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { data: tableList, error: tErr } = await supabaseAdmin.rpc("admin_list_public_tables");
        if (tErr) return Response.json({ error: tErr.message }, { status: 500 });
        const tables: string[] = (tableList as string[]) ?? [];

        const dump: Record<string, unknown[]> = {};
        for (const t of tables) {
          const rows: unknown[] = [];
          let from = 0;
          const PAGE = 1000;
          while (true) {
            const { data, error } = await supabaseAdmin
              .from(t as never)
              .select("*")
              .range(from, from + PAGE - 1);
            if (error) return Response.json({ table: t, error: error.message }, { status: 500 });
            if (!data || data.length === 0) break;
            rows.push(...data);
            if (data.length < PAGE) break;
            from += PAGE;
          }
          dump[t] = rows;
        }

        const authUsers: unknown[] = [];
        let page = 1;
        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) return Response.json({ error: error.message }, { status: 500 });
          authUsers.push(...data.users);
          if (data.users.length < 1000) break;
          page++;
        }

        const payload = {
          version: 1,
          exported_at: new Date().toISOString(),
          source_url: process.env.SUPABASE_URL,
          auth_users: authUsers,
          tables: dump,
        };

        const filename = `db-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        return new Response(JSON.stringify(payload), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
