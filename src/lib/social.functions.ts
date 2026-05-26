import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const toggleFollowSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sellerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.sellerId === userId) throw new Error("You can't follow yourself");

    const { data: existing } = await supabaseAdmin
      .from("seller_follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("seller_id", data.sellerId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("seller_follows")
        .delete()
        .eq("follower_id", userId)
        .eq("seller_id", data.sellerId);
      return { following: false };
    }

    const { error } = await supabaseAdmin
      .from("seller_follows")
      .insert({ follower_id: userId, seller_id: data.sellerId });
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const getSellerFollowState = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ sellerId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { count } = await supabaseAdmin
      .from("seller_follows")
      .select("seller_id", { count: "exact", head: true })
      .eq("seller_id", data.sellerId);
    return { followerCount: count ?? 0 };
  });

export const getMyFollowingForSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sellerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("seller_follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("seller_id", data.sellerId)
      .maybeSingle();
    return { following: !!row };
  });

// ---- Quick replies ----
const qrSchema = z.object({
  label: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
});

export const listQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("message_quick_replies")
      .select("id, label, body, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const createQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => qrSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("message_quick_replies")
      .insert({ user_id: userId, label: data.label, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("message_quick_replies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Onboarding ----
export const markOnboardingDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({ onboarding_done_at: new Date().toISOString() }).eq("id", userId);
    return { ok: true };
  });
