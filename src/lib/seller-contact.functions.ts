import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the seller's phone + whatsapp for a given listing.
 * Routes through the `reveal_listing_contact` SECURITY DEFINER RPC so the
 * reveal is logged in `listing_events` and column-level grants stay locked
 * down for anonymous visitors. Email is intentionally not returned — buyers
 * should reach sellers via the in-app message thread.
 */
export const getSellerContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ listingId: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Resolve slug → id if needed
    let listingId = data.listingId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);
    if (!isUuid) {
      const { data: row } = await supabase
        .from("listings")
        .select("id")
        .eq("slug", listingId)
        .maybeSingle();
      if (!row) return { phone: null, whatsapp: null };
      listingId = row.id;
    }

    const { data: rows, error } = await supabase.rpc("reveal_listing_contact", {
      _listing_id: listingId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      phone: row?.phone ?? null,
      whatsapp: row?.whatsapp ?? null,
    };
  });
