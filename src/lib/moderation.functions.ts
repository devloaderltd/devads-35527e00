import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ReasonCode = z.enum([
  "spam", "nudity", "scam", "harassment", "illegal",
  "duplicate", "underage", "misleading", "other",
]);

const Input = z.object({
  targetType: z.enum(["listing", "user", "review", "message"]),
  targetId: z.string().min(1).max(200),
  action: z.string().min(1).max(50),
  reasonCode: ReasonCode,
  reasonNote: z.string().max(500).optional(),
  notifyUser: z.boolean().default(false),
});

/** Record a moderation action with a reason. Mirrored into audit_log via DB trigger. */
export const recordModerationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "admin" || r.role === "moderator")) {
      throw new Error("Forbidden: admin required");
    }
    const { error } = await supabaseAdmin.from("moderation_actions").insert({
      actor_id: userId,
      target_type: data.targetType,
      target_id: data.targetId,
      action: data.action,
      reason_code: data.reasonCode,
      reason_note: data.reasonNote ?? null,
      notify_user: data.notifyUser,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const ExportInput = z.object({
  fromIso: z.string().min(1),
  toIso: z.string().min(1),
  targetType: z.enum(["listing", "user", "review", "message"]).optional(),
});

export const exportModerationAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden: admin required");

    let q = supabaseAdmin
      .from("moderation_actions")
      .select("id, actor_id, target_type, target_id, action, reason_code, reason_note, notify_user, created_at")
      .gte("created_at", data.fromIso)
      .lte("created_at", data.toIso)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (data.targetType) q = q.eq("target_type", data.targetType);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const header = "id,actor_id,target_type,target_id,action,reason_code,reason_note,notify_user,created_at\n";
    const body = (rows ?? []).map((r) =>
      [r.id, r.actor_id, r.target_type, r.target_id, r.action, r.reason_code,
        JSON.stringify(r.reason_note ?? ""), r.notify_user, r.created_at].join(",")
    ).join("\n");
    return { csv: header + body, count: rows?.length ?? 0 };
  });
