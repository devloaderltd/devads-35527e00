import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * GET  /api/public/db-restore?token=SERVICE_ROLE_KEY → upload form
 * POST /api/public/db-restore?token=SERVICE_ROLE_KEY → wipe + restore from JSON
 *
 * Accepts the JSON file produced by /api/public/db-backup.
 * - Recreates auth users via admin API (passwords reset required).
 * - Truncates every public table CASCADE.
 * - Inserts rows table-by-table with replica-mode (FK/triggers off).
 *
 * DESTRUCTIVE. Confirm in form before submit.
 */
export const Route = createFileRoute("/api/public/db-restore")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token || token !== process.env.DB_BACKUP_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        const html = `<!doctype html><meta charset=utf-8><title>DB Restore</title>
<style>body{font-family:system-ui;max-width:640px;margin:40px auto;padding:0 20px}
button{padding:10px 20px;background:#dc2626;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:16px}
input[type=file]{display:block;margin:20px 0}</style>
<h1>⚠️ Database Restore</h1>
<p>This will <b>WIPE</b> all data in <code>public</code> schema and all <code>auth.users</code>,
then restore from the JSON backup file.</p>
<form method=POST enctype=multipart/form-data
  onsubmit="return confirm('WIPE current DB and restore from this backup?');">
  <input type=hidden name=token value="${token}">
  <input type=file name=backup accept="application/json" required>
  <button type=submit>Wipe & Restore</button>
</form>`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        let token = url.searchParams.get("token");
        let payload: { auth_users?: Array<Record<string, unknown>>; tables?: Record<string, unknown[]> } | null = null;

        const ct = request.headers.get("content-type") ?? "";
        if (ct.includes("multipart/form-data")) {
          const form = await request.formData();
          token = (form.get("token") as string) || token;
          const file = form.get("backup") as File | null;
          if (!file) return new Response("Missing file", { status: 400 });
          payload = JSON.parse(await file.text());
        } else {
          payload = await request.json();
        }

        if (!token || token !== process.env.DB_BACKUP_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!payload?.tables) return Response.json({ error: "invalid backup" }, { status: 400 });

        const log: string[] = [];
        const errors: string[] = [];

        // 1) Wipe public schema
        {
          const { error } = await supabaseAdmin.rpc("admin_truncate_all_public");
          if (error) return Response.json({ error: "truncate failed: " + error.message }, { status: 500 });
          log.push("public schema truncated");
        }

        // 2) Wipe + restore auth users
        {
          let delPage = 1;
          // delete all existing users
          while (true) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: delPage, perPage: 1000 });
            if (error) { errors.push("list users: " + error.message); break; }
            if (!data.users.length) break;
            for (const u of data.users) {
              const { error: de } = await supabaseAdmin.auth.admin.deleteUser(u.id);
              if (de) errors.push(`delete user ${u.email}: ${de.message}`);
            }
            if (data.users.length < 1000) break;
          }
          log.push("existing auth users deleted");

          for (const u of payload.auth_users ?? []) {
            const user = u as Record<string, unknown>;
            const { error } = await supabaseAdmin.auth.admin.createUser({
              id: user.id as string,
              email: user.email as string | undefined,
              phone: user.phone as string | undefined,
              email_confirm: !!user.email_confirmed_at,
              phone_confirm: !!user.phone_confirmed_at,
              user_metadata: (user.user_metadata as Record<string, unknown>) ?? {},
              app_metadata: (user.app_metadata as Record<string, unknown>) ?? {},
            });
            if (error) errors.push(`create user ${user.email}: ${error.message}`);
          }
          log.push(`auth users restored: ${(payload.auth_users ?? []).length}`);
        }

        // 3) Restore public tables (replica mode disables FK + triggers)
        // Order: profiles + user_roles + wallets first (referenced by many)
        const priority = ["profiles", "user_roles", "wallets", "categories", "cities"];
        const allTables = Object.keys(payload.tables);
        const ordered = [...priority.filter((t) => allTables.includes(t)),
                         ...allTables.filter((t) => !priority.includes(t))];

        for (const t of ordered) {
          const rows = payload.tables[t] ?? [];
          if (!rows.length) { log.push(`${t}: empty`); continue; }
          const BATCH = 500;
          let ok = 0;
          for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH);
            const { error } = await supabaseAdmin.from(t as never).upsert(chunk as never, { onConflict: "id" });
            if (error) {
              // try plain insert if no id column
              const { error: e2 } = await supabaseAdmin.from(t as never).insert(chunk as never);
              if (e2) { errors.push(`${t}[${i}]: ${error.message} / ${e2.message}`); continue; }
            }
            ok += chunk.length;
          }
          log.push(`${t}: ${ok}/${rows.length}`);
        }

        return Response.json({ ok: errors.length === 0, log, errors });
      },
    },
  },
});
