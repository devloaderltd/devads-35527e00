import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyIpnSignature } from "@/lib/nowpayments.server";

let _supabase: any = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

const FINAL_PAID = new Set(["finished", "confirmed", "sending"]);

export const Route = createFileRoute("/api/public/payments/nowpayments-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: any;
        try {
          payload = await verifyIpnSignature(raw, request.headers.get("x-nowpayments-sig"));
        } catch (e: any) {
          console.error("IPN verify failed:", e?.message);
          return new Response("invalid signature", { status: 401 });
        }

        const orderId = payload.order_id as string | undefined;
        const status = String(payload.payment_status ?? "waiting");
        if (!orderId) return Response.json({ ok: true, ignored: "no order_id" });

        const supabase = db();
        const { data: topup } = await supabase
          .from("crypto_topups")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        if (!topup) {
          console.error("Topup not found for order_id", orderId);
          return Response.json({ ok: true, ignored: "unknown order" });
        }

        await supabase
          .from("crypto_topups")
          .update({
            status,
            np_payment_id: String(payload.payment_id ?? topup.np_payment_id ?? ""),
            pay_currency: payload.pay_currency ?? topup.pay_currency,
            pay_amount: payload.pay_amount ?? topup.pay_amount,
            raw_last_ipn: payload,
          })
          .eq("id", orderId);

        if (FINAL_PAID.has(status) && !topup.credited) {
          // Credit USD wallet using the original price_amount_usd we asked NOWPayments for
          const { error: rpcErr } = await supabase.rpc("credit_wallet", {
            _user_id: topup.user_id,
            _amount: Number(topup.price_amount_usd),
            _reference: orderId,
            _description: `Crypto top-up (${payload.pay_currency ?? "crypto"})`,
          });
          if (rpcErr) {
            console.error("credit_wallet failed:", rpcErr);
            return new Response("credit failed", { status: 500 });
          }
          await supabase.from("crypto_topups").update({ credited: true }).eq("id", orderId);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
