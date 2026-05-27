import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createInvoice } from "./plisio.server";

const FEATURED_USD_DEFAULT = 9.99;
const BUMP_USD_DEFAULT = 2.99;
const FEATURED_DAYS_DEFAULT = 7;
const BUMP_DAYS_DEFAULT = 1;
const LISTING_POST_USD_DEFAULT = 1.00;

async function loadPricing() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("featured_price_usd, bump_price_usd, featured_days, bump_days, listing_post_price_usd")
    .eq("id", "global")
    .maybeSingle();
  return {
    featuredPrice: Number(data?.featured_price_usd ?? FEATURED_USD_DEFAULT),
    bumpPrice: Number(data?.bump_price_usd ?? BUMP_USD_DEFAULT),
    featuredDays: Number(data?.featured_days ?? FEATURED_DAYS_DEFAULT),
    bumpDays: Number(data?.bump_days ?? BUMP_DAYS_DEFAULT),
    listingPostPrice: Number((data as any)?.listing_post_price_usd ?? LISTING_POST_USD_DEFAULT),
  };
}

export const getPromotionPricing = createServerFn({ method: "GET" })
  .handler(async () => loadPricing());

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    // Ensure wallet exists
    await supabaseAdmin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

    const [{ data: wallet }, { data: txs }, { data: topups }] = await Promise.all([
      supabaseAdmin.from("wallets").select("balance_usd, updated_at").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("crypto_topups").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);

    return {
      balance: Number(wallet?.balance_usd ?? 0),
      updatedAt: wallet?.updated_at ?? null,
      transactions: txs ?? [],
      topups: topups ?? [],
    };
  });

export const createTopupInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amountUsd: number; origin: string }) => {
    if (!data || typeof data.amountUsd !== "number") throw new Error("Invalid amount");
    if (data.amountUsd < 5 || data.amountUsd > 10000) throw new Error("Amount must be between $5 and $10,000");
    if (!/^https?:\/\//.test(data.origin)) throw new Error("Invalid origin");
    return data;
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const amount = Math.round(data.amountUsd * 100) / 100;

    const { data: row, error } = await supabaseAdmin
      .from("crypto_topups")
      .insert({ user_id: userId, price_amount_usd: amount, status: "waiting" })
      .select("id")
      .single();
    if (error || !row) throw new Error(`Failed to create top-up: ${error?.message}`);

    const ipn = `${data.origin}/api/public/payments/plisio-ipn`;
    try {
      const invoice = await createInvoice({
        amountUsd: amount,
        orderId: row.id,
        orderName: `Wallet top-up — $${amount.toFixed(2)}`,
        callbackUrl: ipn,
        successUrl: `${data.origin}/wallet?topup=success`,
        cancelUrl: `${data.origin}/wallet?topup=cancel`,
      });

      await supabaseAdmin
        .from("crypto_topups")
        .update({ np_invoice_id: invoice.id, invoice_url: invoice.invoice_url })
        .eq("id", row.id);

      return { invoiceUrl: invoice.invoice_url, topupId: row.id };
    } catch (e: any) {
      await supabaseAdmin.from("crypto_topups").update({ status: "failed" }).eq("id", row.id);
      throw new Error(e?.message ?? "Failed to create invoice");
    }
  });

export const promoteWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listingId: string; type: "featured" | "bump" }) => {
    if (!/^[a-f0-9-]{36}$/.test(data.listingId)) throw new Error("Invalid listingId");
    if (data.type !== "featured" && data.type !== "bump") throw new Error("Invalid type");
    return data;
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const pricing = await loadPricing();
    const amount = data.type === "featured" ? pricing.featuredPrice : pricing.bumpPrice;
    const days = data.type === "featured" ? pricing.featuredDays : pricing.bumpDays;

    const { data: listing, error: lerr } = await supabaseAdmin
      .from("listings")
      .select("id, user_id, title")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lerr || !listing) throw new Error("Listing not found");
    if (listing.user_id !== userId) throw new Error("Not your listing");

    // Debit (raises 'insufficient funds' if balance too low)
    const { error: debitErr } = await supabaseAdmin.rpc("debit_wallet", {
      _user_id: userId,
      _amount: amount,
      _reference: data.listingId,
      _description: data.type === "featured" ? `Featured promotion (${days}d)` : "Bump promotion",
    });
    if (debitErr) {
      if (debitErr.message?.toLowerCase().includes("insufficient")) {
        throw new Error("Insufficient wallet balance. Please top up.");
      }
      throw new Error(debitErr.message);
    }

    // Record payment
    const { data: pay } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        listing_id: data.listingId,
        promotion_type: data.type,
        provider: "wallet",
        amount,
        currency: "USD",
        status: "completed",
      })
      .select("id")
      .single();

    // Apply promotion
    if (data.type === "bump") {
      await supabaseAdmin.from("listings").update({ bumped_at: new Date().toISOString() }).eq("id", data.listingId);
    } else {
      const now = new Date();
      const ends = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await supabaseAdmin.from("listing_promotions").insert({
        listing_id: data.listingId,
        type: "featured",
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
        payment_id: pay?.id ?? null,
      });
    }

    return { ok: true };
  });

