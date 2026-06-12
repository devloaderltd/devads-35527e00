import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

/** Export full public schema + auth users metadata as a JSON dump. Admin only. */
export const exportDatabase = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tableList, error: tErr } = await supabaseAdmin.rpc("admin_list_public_tables");
    if (tErr) throw new Error("list tables: " + tErr.message);
    const tables: string[] = (tableList as string[]) ?? [];

    const dump: Record<string, Array<Record<string, unknown>>> = {};
    for (const t of tables) {
      const rows: Array<Record<string, unknown>> = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(t as never).select("*").range(from, from + PAGE - 1);
        if (error) throw new Error(`${t}: ${error.message}`);
        if (!data || data.length === 0) break;
        rows.push(...(data as Array<Record<string, unknown>>));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      dump[t] = rows;
    }

    const authUsers: Array<Record<string, unknown>> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("list users: " + error.message);
      authUsers.push(...(data.users as unknown as Array<Record<string, unknown>>));
      if (data.users.length < 1000) break;
      page++;
    }

    const payload = {
      version: 1 as const,
      exported_at: new Date().toISOString(),
      auth_users: authUsers,
      tables: dump,
    };
    return {
      json: JSON.stringify(payload),
      tableCount: Object.keys(dump).length,
      userCount: authUsers.length,
    };
  });

const ImportInput = z.object({
  payloadJson: z.string().min(2),
  wipeFirst: z.boolean().default(true),
});

type ImportPayload = {
  auth_users?: Array<Record<string, unknown>>;
  tables: Record<string, Array<Record<string, unknown>>>;
};

/** Restore a JSON dump created by exportDatabase. Admin only. DESTRUCTIVE. */
export const importDatabase = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const log: string[] = [];
    const errors: string[] = [];

    let parsed: ImportPayload;
    try {
      parsed = JSON.parse(parsedJson) as ImportPayload;
    } catch {
      throw new Error("Invalid backup JSON");
    }
    if (!parsed?.tables || typeof parsed.tables !== "object") {
      throw new Error("Invalid backup: missing 'tables'");
    }


    if (data.wipeFirst) {
      const { error } = await supabaseAdmin.rpc("admin_truncate_all_public");
      if (error) throw new Error("truncate failed: " + error.message);
      log.push("public schema truncated");

      let delPage = 1;
      while (true) {
        const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({
          page: delPage, perPage: 1000,
        });
        if (lErr) { errors.push("list users: " + lErr.message); break; }
        if (!list.users.length) break;
        for (const u of list.users) {
          const { error: de } = await supabaseAdmin.auth.admin.deleteUser(u.id);
          if (de) errors.push(`delete user ${u.email}: ${de.message}`);
        }
        if (list.users.length < 1000) break;
      }
      log.push("existing auth users deleted");
    }

    for (const u of parsed.auth_users ?? []) {
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
    log.push(`auth users restored: ${(parsed.auth_users ?? []).length}`);

    const priority = ["profiles", "user_roles", "wallets", "categories", "cities"];
    const allTables = Object.keys(parsed.tables);
    const ordered = [
      ...priority.filter((t) => allTables.includes(t)),
      ...allTables.filter((t) => !priority.includes(t)),
    ];

    for (const t of ordered) {
      const rows = parsed.tables[t] ?? [];
      if (!rows.length) { log.push(`${t}: empty`); continue; }
      const BATCH = 500;
      let ok = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { error } = await supabaseAdmin
          .from(t as never).upsert(chunk as never, { onConflict: "id" });
        if (error) {
          const { error: e2 } = await supabaseAdmin.from(t as never).insert(chunk as never);
          if (e2) { errors.push(`${t}[${i}]: ${error.message} / ${e2.message}`); continue; }
        }
        ok += chunk.length;
      }
      log.push(`${t}: ${ok}/${rows.length}`);
    }

    return { ok: errors.length === 0, log, errors };
  });
