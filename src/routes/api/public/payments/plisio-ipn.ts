import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyCallback } from "@/lib/plisio.server";
import { enqueueTransactionalEmail, getUserEmail, getUserDisplayName } from "@/lib/email/enqueue.server";

let _supabase: any = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

// Plisio statuses: new, pending, expired, completed, mismatch, error, cancelled
const FINAL_PAID = new Set(["completed", "mismatch"]);
const FINAL_FAILED = new Set(["expired", "error", "cancelled"]);

export const Route = createFileRoute("/api/public/payments/plisio-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: any;
        try {
          payload = await verifyCallback(raw);
        } catch (e: any) {
          console.error("Plisio verify failed:", e?.message);
          return new Response("invalid signature", { status: 401 });
        }

        const orderId = payload.order_number as string | undefined;
        const status = String(payload.status ?? "new");
        if (!orderId) return Response.json({ ok: true, ignored: "no order_number" });

        const supabase = db();
        const { data: topup } = await supabase
          .from("crypto_topups")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        if (!topup) {
          console.error("Topup not found for order_number", orderId);
          return Response.json({ ok: true, ignored: "unknown order" });
        }

        const normalizedStatus = FINAL_FAILED.has(status) ? "failed" : status;

        await supabase
          .from("crypto_topups")
          .update({
            status: normalizedStatus,
            np_payment_id: String(payload.txn_id ?? topup.np_payment_id ?? ""),
            pay_currency: payload.currency ?? topup.pay_currency,
            pay_amount: payload.amount ?? topup.pay_amount,
            raw_last_ipn: payload,
          })
          .eq("id", orderId);

        if (FINAL_PAID.has(status) && !topup.credited) {
          const { error: rpcErr } = await supabase.rpc("credit_wallet", {
            _user_id: topup.user_id,
            _amount: Number(topup.price_amount_usd),
            _reference: orderId,
            _description: `Crypto top-up (${payload.currency ?? "crypto"})`,
          });
          if (rpcErr) {
            console.error("credit_wallet failed:", rpcErr);
            return new Response("credit failed", { status: 500 });
          }
          await supabase.from("crypto_topups").update({ credited: true }).eq("id", orderId);

          try {
            const email = await getUserEmail(topup.user_id);
            if (email) {
              const name = await getUserDisplayName(topup.user_id);
              await enqueueTransactionalEmail({
                templateName: "topup-confirmed",
                recipientEmail: email,
                idempotencyKey: `topup-${orderId}`,
                templateData: {
                  recipientName: name ?? undefined,
                  amountUsd: Number(topup.price_amount_usd),
                  currency: payload.currency ?? undefined,
                  reference: orderId,
                  walletUrl: "https://callescort.devloader.com/wallet",
                },
              });
            }
          } catch (e) { console.error("topup email failed", e); }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
