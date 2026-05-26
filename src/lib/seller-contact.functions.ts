import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns the seller's email + phone for a given listing.
 * Requires the caller to be signed in (anti-scraping protection).
 */
export const getSellerContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ listingId: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.listingId);
    const { data: listing, error: lerr } = await supabaseAdmin
      .from("listings")
      .select("user_id, status")
      .eq(isUuid ? "id" : "slug", data.listingId)
      .maybeSingle();
    if (lerr) throw new Error(lerr.message);
    if (!listing || listing.status !== "active") {
      return { email: null, phone: null };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("id", listing.user_id)
      .maybeSingle();

    const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(
      listing.user_id,
    );

    return {
      email: userInfo?.user?.email ?? null,
      phone: profile?.phone ?? null,
    };
  });
