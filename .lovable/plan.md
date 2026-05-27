# Switch crypto gateway: NOWPayments → Plisio

Yes — Plisio (https://plisio.net) is a crypto payment gateway with a hosted-invoice flow very similar to NOWPayments, so it slots into the existing wallet top-up architecture cleanly. No DB schema or UI changes are needed; only the server-side gateway adapter and webhook are replaced.

## Scope

In scope:
- Replace NOWPayments invoice creation + IPN with Plisio equivalents
- Keep the existing `crypto_topups` table, wallet credit logic, emails, and the user-facing `/wallet` page exactly as they are
- Keep field names like `np_invoice_id` / `np_payment_id` as-is (just store Plisio IDs in them) to avoid a migration churn — or optionally rename in a follow-up

Out of scope:
- Changing wallet UI, pricing, or balance flow
- Removing already-completed NOWPayments top-ups from history (they remain valid records)

## Steps

1. **Secrets**
   - Request two new secrets via `add_secret`: `PLISIO_API_KEY`, `PLISIO_WEBHOOK_SECRET` (Plisio uses the API key itself as the HMAC secret for callback verification, so `PLISIO_WEBHOOK_SECRET` may be optional — likely we just reuse `PLISIO_API_KEY`).
   - Leave `NOWPAYMENTS_API_KEY` / `NOWPAYMENTS_IPN_SECRET` in place until cutover is verified, then remove.

2. **New server helper `src/lib/plisio.server.ts`**
   - `createInvoice({ amountUsd, orderId, orderName, callbackUrl, successUrl, cancelUrl })` → calls `GET https://api.plisio.net/api/v1/invoices/new` with `api_key`, `source_currency=USD`, `source_amount`, `order_number`, `order_name`, `callback_url` (append `?json=true`), `success_url`, `cancel_callback_url`. Returns `{ id, invoice_url }` from `data.txn_id` / `data.invoice_url`.
   - `verifyCallback(payload)` → implements Plisio's HMAC verification: take POSTed JSON, remove `verify_hash`, sort keys, JSON-encode, HMAC-SHA1 with `PLISIO_API_KEY` as secret, compare to `verify_hash` using `timingSafeEqual`.

3. **Update `src/lib/wallet.functions.ts`**
   - In `createTopupInvoice`, swap `createInvoice` import to the new Plisio helper.
   - Change IPN URL to `${origin}/api/public/payments/plisio-ipn`.
   - Keep storing returned IDs in `np_invoice_id` / `np_payment_id` columns.

4. **New webhook route `src/routes/api/public/payments/plisio-ipn.ts`**
   - Mirrors current `nowpayments-ipn.ts` structure.
   - Verifies signature with `verifyCallback`.
   - Maps Plisio statuses: `completed` / `mismatch` (overpaid) → credit wallet; `new` / `pending` / `confirming` → just update status; `expired` / `cancelled` / `error` → mark failed.
   - Uses existing `credit_wallet` RPC and existing confirmation email enqueue — no changes there.

5. **Delete old files (after verification)**
   - `src/lib/nowpayments.server.ts`
   - `src/routes/api/public/payments/nowpayments-ipn.ts`
   - `secrets--delete_secret` for `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET`.

6. **Configure Plisio dashboard (user action)**
   - In Plisio merchant settings, set callback URL to: `https://devads.lovable.app/api/public/payments/plisio-ipn` (and add the preview URL too if testing there).
   - Whitelist allowed currencies as desired.

## Open questions

1. Do you want the column names renamed from `np_invoice_id` / `np_payment_id` / `np_*` to neutral `provider_invoice_id` etc.? Recommended **no** for this change — keep migration minimal — but happy to do it.
2. Should I keep the old NOWPayments webhook live during cutover (a few days) so any in-flight invoices still credit, or remove immediately?
3. Plisio supports a "white-label" embedded checkout in addition to the hosted invoice page. I'll use the hosted invoice page (same UX as today). OK?

Once you confirm, I'll implement in build mode and request the `PLISIO_API_KEY` secret.
