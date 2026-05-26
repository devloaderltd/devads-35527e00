import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";

const submitSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  docType: z.enum(["passport", "id_card", "drivers_license"]),
  docFrontUrl: z.string().min(1).max(500),
  docBackUrl: z.string().min(1).max(500).optional().nullable(),
  selfieUrl: z.string().min(1).max(500),
});

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Block duplicates while pending/approved
    const { data: existing } = await supabase
      .from("kyc_submissions")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) throw new Error(`You already have a ${existing.status} submission.`);

    const { error } = await supabase.from("kyc_submissions").insert({
      user_id: userId,
      full_name: data.fullName,
      doc_type: data.docType,
      doc_front_url: data.docFrontUrl,
      doc_back_url: data.docBackUrl ?? null,
      selfie_url: data.selfieUrl,
    });
    if (error) throw new Error(error.message);

    await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", userId);
    return { ok: true };
  });

export const getMyKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("kyc_submissions")
      .select("id, status, doc_type, full_name, review_note, created_at, reviewed_at, bonus_credited")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { submission: data };
  });

export const getKycPendingCount = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { count } = await supabaseAdmin
      .from("kyc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return { count: count ?? 0 };
  });

export const adminListKyc = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { status?: "pending" | "approved" | "rejected" | "all" }) => ({
    status: input.status ?? "pending",
  }))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("kyc_submissions")
      .select("*, profile:profiles!kyc_submissions_user_id_fkey(display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(200);
    // The above join may not exist; fallback to separate fetch
    let { data: items, error } = await q;
    if (error) {
      const r = await supabaseAdmin
        .from("kyc_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      items = r.data as never;
    }
    const rowsArr = (items ?? []) as Array<Record<string, unknown>>;
    const filtered = data.status === "all" ? rowsArr : rowsArr.filter((r) => r.status === data.status);

    const signed = await Promise.all(
      filtered.map(async (r) => {
        const sign = async (path: string | null | undefined) => {
          if (!path) return null;
          const { data } = await supabaseAdmin.storage
            .from("kyc-documents")
            .createSignedUrl(path, 3600);
          return data?.signedUrl ?? null;
        };
        return {
          ...r,
          doc_front_signed: await sign(r.doc_front_url as string),
          doc_back_signed: await sign(r.doc_back_url as string | null),
          selfie_signed: await sign(r.selfie_url as string),
        };
      }),
    );

    const signedAny = signed as Array<Record<string, unknown>>;
    const ids = [...new Set(signedAny.map((r) => r.user_id as string))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      items: signedAny.map((r) => ({
        ...r,
        profile: map.get(r.user_id as string) ?? null,
      })),
    };

  });


export const adminReviewKyc = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { submissionId: string; action: "approve" | "reject"; note?: string }) => {
    if (!z.string().uuid().safeParse(input.submissionId).success) throw new Error("Invalid id");
    if (!["approve", "reject"].includes(input.action)) throw new Error("Invalid action");
    if (input.action === "reject" && !(input.note?.trim())) throw new Error("Note required for rejection");
    return { submissionId: input.submissionId, action: input.action, note: input.note?.trim().slice(0, 1000) };
  })
  .handler(async ({ data }) => {
    if (data.action === "approve") {
      const { error } = await supabaseAdmin.rpc("approve_kyc", {
        _submission_id: data.submissionId,
        ...(data.note ? { _note: data.note } : {}),
      });

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.rpc("reject_kyc", {
        _submission_id: data.submissionId,
        _note: data.note!,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
