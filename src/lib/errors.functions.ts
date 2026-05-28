import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ListInput = z.object({
  source: z.enum(["client", "server"]).default("client"),
  severity: z.enum(["info", "warn", "error", "fatal"]).optional(),
  kind: z.string().optional(),
  sinceHours: z.number().min(1).max(720).default(24),
  limit: z.number().min(1).max(500).default(100),
});

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Forbidden: admin required");
}

export const listErrors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const table = data.source === "client" ? "client_error_logs" : "server_error_logs";
    const since = new Date(Date.now() - data.sinceHours * 3600_000).toISOString();
    let q = supabaseAdmin.from(table).select("*").gte("created_at", since)
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.severity) q = q.eq("severity", data.severity);
    if (data.kind && data.source === "client") q = (q as any).eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const errorStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const day = new Date(Date.now() - 24 * 3600_000).toISOString();
    const week = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const [c24, c7, s24, s7] = await Promise.all([
      supabaseAdmin.from("client_error_logs").select("*", { count: "exact", head: true }).gte("created_at", day),
      supabaseAdmin.from("client_error_logs").select("*", { count: "exact", head: true }).gte("created_at", week),
      supabaseAdmin.from("server_error_logs").select("*", { count: "exact", head: true }).gte("created_at", day),
      supabaseAdmin.from("server_error_logs").select("*", { count: "exact", head: true }).gte("created_at", week),
    ]);
    return {
      client24: c24.count ?? 0,
      client7d: c7.count ?? 0,
      server24: s24.count ?? 0,
      server7d: s7.count ?? 0,
    };
  });
