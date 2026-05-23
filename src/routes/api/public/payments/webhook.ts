import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const md = session.metadata ?? {};
  const userId = md.userId as string | undefined;
  const listingId = md.listing_id as string | undefined;
  const promotionType = md.promotion_type as "featured" | "bump" | undefined;

  if (!userId || !listingId || !promotionType) {
    console.error("Webhook missing metadata", md);
    return;
  }

  const supabase = getSupabase();
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "usd").toUpperCase();

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      listing_id: listingId,
      promotion_type: promotionType,
      provider: "stripe",
      provider_session_id: session.id,
      amount,
      currency,
      status: "completed",
    })
    .select("id")
    .single();
  if (payErr) console.error("Insert payment failed", payErr);

  if (promotionType === "bump") {
    const { error } = await supabase
      .from("listings")
      .update({ bumped_at: new Date().toISOString() })
      .eq("id", listingId);
    if (error) console.error("Bump update failed", error);
  } else if (promotionType === "featured") {
    const now = new Date();
    const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("listing_promotions").insert({
      listing_id: listingId,
      type: "featured",
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      payment_id: payment?.id ?? null,
    });
    if (error) console.error("Featured insert failed", error);
  }
  // Suppress unused env warning in case branching is added later
  void env;
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Invalid env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data.object, env);
          } else {
            console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
