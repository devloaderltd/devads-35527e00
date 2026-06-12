import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./admin-middleware";

// ─── Backup schema + migration ──────────────────────────────────────────────

export const LATEST_BACKUP_VERSION = 2 as const;

/**
 * Strict zod schema for the current backup payload shape (v2).
 * Reject anything that doesn't match after migration so we never apply garbage.
 */
const RowSchema = z.record(z.unknown());
const TablesSchema = z.record(z.array(RowSchema));

const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  email_confirmed_at: z.union([z.string(), z.null()]).optional(),
  phone_confirmed_at: z.union([z.string(), z.null()]).optional(),
  user_metadata: z.record(z.unknown()).optional(),
  app_metadata: z.record(z.unknown()).optional(),
}).passthrough();

const BackupV2Schema = z.object({
  version: z.literal(LATEST_BACKUP_VERSION),
  exported_at: z.string().min(1),
  source: z.string().optional(),
  auth_users: z.array(AuthUserSchema).default([]),
  tables: TablesSchema,
});

export type BackupV2 = z.infer<typeof BackupV2Schema>;

/**
 * Migrate older backup shapes to v2. Returns null when the shape is too foreign
 * to safely upgrade (caller should reject).
 *
 * Supported upgrades:
 *  - no `version` field, but has `tables`        → v1 (assume legacy admin dump)
 *  - `version: 1`                                 → v2 (add empty source, normalize)
 *  - already v2                                   → returned untouched
 */
function migrateBackup(raw: unknown): { ok: true; data: unknown; from: number; to: number } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "Backup is not an object" };
  const obj = raw as Record<string, unknown>;

  if (!("tables" in obj) || typeof obj.tables !== "object" || obj.tables === null) {
    return { ok: false, reason: "Backup is missing a 'tables' object" };
  }

  const from = typeof obj.version === "number" ? obj.version : 0;
  if (from > LATEST_BACKUP_VERSION) {
    return { ok: false, reason: `Backup version ${from} is newer than supported (${LATEST_BACKUP_VERSION}). Upgrade the app first.` };
  }

  let working: Record<string, unknown> = { ...obj };

  // v0 (no version) → v1: assume the legacy `/api/public/db-backup` shape.
  if (from === 0) {
    working = {
      version: 1,
      exported_at: typeof working.exported_at === "string" ? working.exported_at : new Date(0).toISOString(),
      auth_users: Array.isArray(working.auth_users) ? working.auth_users : [],
      tables: working.tables,
    };
  }

  // v1 → v2: add `source`, ensure auth_users is an array, drop unknown top-level junk.
  if ((working.version as number) === 1) {
    working = {
      version: 2,
      exported_at: typeof working.exported_at === "string" ? working.exported_at : new Date().toISOString(),
      source: typeof working.source === "string" ? working.source : "legacy-v1",
      auth_users: Array.isArray(working.auth_users) ? working.auth_users : [],
      tables: working.tables,
    };
  }

  return { ok: true, data: working, from, to: LATEST_BACKUP_VERSION };
}

/** Validate (and migrate) raw JSON text. Throws Error with a user-readable message on failure. */
function parseAndValidateBackup(jsonText: string): { backup: BackupV2; migratedFrom: number } {
  let raw: unknown;
  try { raw = JSON.parse(jsonText); }
  catch { throw new Error("Backup file is not valid JSON"); }

  const migrated = migrateBackup(raw);
  if (!migrated.ok) throw new Error(migrated.reason);

  const parsed = BackupV2Schema.safeParse(migrated.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") || "(root)";
    throw new Error(`Backup failed schema validation at ${path}: ${first?.message ?? "unknown error"}`);
  }
  return { backup: parsed.data, migratedFrom: migrated.from };
}

// ─── Export ─────────────────────────────────────────────────────────────────

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

    const payload: BackupV2 = {
      version: LATEST_BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      source: process.env.SUPABASE_URL ?? "unknown",
      auth_users: authUsers as never,
      tables: dump,
    };
    return {
      json: JSON.stringify(payload),
      tableCount: Object.keys(dump).length,
      userCount: authUsers.length,
    };
  });

// ─── Inspect (dry-run) ──────────────────────────────────────────────────────

const InspectInput = z.object({ payloadJson: z.string().min(2) });

export const inspectBackup = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => InspectInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { backup, migratedFrom } = parseAndValidateBackup(data.payloadJson);

    // Existing per-table counts from the live DB (best-effort; nulls become 0).
    const counts = await Promise.all(
      Object.keys(backup.tables).map(async (name) => {
        const { count, error } = await supabaseAdmin
          .from(name as never)
          .select("*", { count: "exact", head: true });
        return { name, existing: error ? null : (count ?? 0) };
      }),
    );
    const existingMap = new Map(counts.map((c) => [c.name, c.existing]));

    const tableSummary = Object.entries(backup.tables)
      .map(([name, rows]) => {
        const existing = existingMap.get(name) ?? null;
        const imported = rows.length;
        const delta = existing == null ? null : imported - existing;
        return {
          name,
          rows: imported,
          existing,
          delta,
          changed: existing == null ? true : delta !== 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Live tables that the backup does NOT contain — flagged so admins notice them.
    const backupTableSet = new Set(Object.keys(backup.tables));
    const { data: liveTables } = await supabaseAdmin.rpc("admin_list_public_tables");
    const missingFromBackup = ((liveTables as string[] | null) ?? [])
      .filter((t) => !backupTableSet.has(t));

    return {
      ok: true as const,
      version: backup.version,
      migratedFrom,
      migrated: migratedFrom !== backup.version,
      exportedAt: backup.exported_at,
      source: backup.source ?? null,
      authUserCount: backup.auth_users.length,
      tableCount: tableSummary.length,
      totalRows: tableSummary.reduce((s, t) => s + t.rows, 0),
      changedTableCount: tableSummary.filter((t) => t.changed).length,
      missingFromBackup,
      tables: tableSummary,
    };
  });

// ─── Import ─────────────────────────────────────────────────────────────────

const ImportInput = z.object({
  payloadJson: z.string().min(2),
  wipeFirst: z.boolean().default(true),
  includeAuthUsers: z.boolean().default(true),
  onlyTables: z.array(z.string().min(1)).optional(),
});

/** Restore a JSON dump created by exportDatabase. Admin only. DESTRUCTIVE. */
export const importDatabase = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const log: string[] = [];
    const errors: string[] = [];

    const { backup, migratedFrom } = parseAndValidateBackup(data.payloadJson);
    if (migratedFrom !== backup.version) {
      log.push(`migrated backup v${migratedFrom} → v${backup.version}`);
    } else {
      log.push(`backup schema v${backup.version} validated`);
    }

    const includedTables = new Set(
      data.onlyTables && data.onlyTables.length > 0
        ? data.onlyTables.filter((t) => t in backup.tables)
        : Object.keys(backup.tables),
    );
    if (data.onlyTables && includedTables.size === 0) {
      throw new Error("None of the selected tables exist in the backup");
    }

    if (data.wipeFirst) {
      const { error } = await supabaseAdmin.rpc("admin_truncate_all_public");
      if (error) throw new Error("truncate failed: " + error.message);
      log.push("public schema truncated");

      if (data.includeAuthUsers) {
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
    }

    if (data.includeAuthUsers) {
      for (const user of backup.auth_users) {
        const { error } = await supabaseAdmin.auth.admin.createUser({
          id: user.id,
          email: (user.email as string | undefined) ?? undefined,
          phone: (user.phone as string | undefined) ?? undefined,
          email_confirm: !!user.email_confirmed_at,
          phone_confirm: !!user.phone_confirmed_at,
          user_metadata: (user.user_metadata as Record<string, unknown>) ?? {},
          app_metadata: (user.app_metadata as Record<string, unknown>) ?? {},
        });
        if (error) errors.push(`create user ${user.email ?? user.id}: ${error.message}`);
      }
      log.push(`auth users restored: ${backup.auth_users.length}`);
    } else {
      log.push("auth users skipped");
    }

    const priority = ["profiles", "user_roles", "wallets", "categories", "cities"];
    const allTables = Object.keys(backup.tables).filter((t) => includedTables.has(t));
    const ordered = [
      ...priority.filter((t) => allTables.includes(t)),
      ...allTables.filter((t) => !priority.includes(t)),
    ];

    for (const t of ordered) {
      const rows = backup.tables[t] ?? [];
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

    return { ok: errors.length === 0, log, errors, migratedFrom, version: backup.version };
  });
