## Goal
Replace Stripe with NOWPayments crypto gateway and add a wallet (USD credits) system. Users top up with crypto → balance stored as USD credits → spend credits on Featured ($9.99) or Bump ($2.99) promotions.

## Database changes (migration)
- New table `wallets`: `user_id` (PK, FK profiles), `balance_usd` numeric(12,2) default 0, `updated_at`. RLS: user reads own; service role writes.
- New table `wallet_transactions`: `id`, `user_id`, `type` (`topup` | `spend` | `refund` | `adjustment`), `amount_usd` (signed), `balance_after`, `reference` (e.g. listing_id / nowpayments invoice id), `description`, `created_at`. RLS: user reads own.
- New table `crypto_topups`: `id`, `user_id`, `nowpayments_invoice_id` / `payment_id`, `pay_currency`, `pay_amount`, `price_amount_usd`, `status` (`waiting`|`confirming`|`confirmed`|`finished`|`failed`|`expired`), `credited` boolean default false, timestamps.
- Repurpose `payments` table for wallet spends (provider = `'wallet'`), or insert new rows on spend. Keep historical Stripe rows untouched.
- Postgres function `credit_wallet(user_id, amount_usd, reference, description)` and `debit_wallet(...)` — SECURITY DEFINER, atomic, returns new balance, raises if insufficient funds. Grant EXECUTE to service role only.

## Backend (server functions + webhook)
- Remove: `src/lib/stripe.ts`, `src/lib/stripe.server.ts`, `src/components/StripeEmbeddedCheckout.tsx`, `src/components/PaymentTestModeBanner.tsx`, `src/utils/payments.functions.ts`, `src/routes/api/public/payments/webhook.ts`, `src/routes/checkout.return.tsx`. Uninstall `@stripe/*` and `stripe` packages.
- New `src/lib/nowpayments.server.ts`: helper to call NOWPayments REST API (`https://api.nowpayments.io/v1`), reads `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` from env.
- New `src/lib/wallet.functions.ts` (server functions, all behind `requireSupabaseAuth`):
  - `getWallet()` → balance + recent transactions
  - `createTopupInvoice({ amountUsd })` → calls NOWPayments `/invoice` with `price_amount`, `price_currency='usd'`, `ipn_callback_url`, `success_url`, `cancel_url`, `order_id=<topup row id>`; inserts `crypto_topups` row; returns `invoice_url` to redirect to NOWPayments hosted checkout.
  - `promoteWithWallet({ listingId, type })` → validates listing ownership, debits wallet ($9.99 or $2.99 via `debit_wallet` RPC), then applies bump (`bumped_at = now()`) or inserts `listing_promotions` (7d featured). Inserts `payments` row with `provider='wallet'`, `status='completed'`.
- New webhook `src/routes/api/public/payments/nowpayments-ipn.ts`:
  - Verifies HMAC-SHA512 signature header `x-nowpayments-sig` against sorted JSON body using `NOWPAYMENTS_IPN_SECRET`.
  - On `payment_status='finished'`: looks up `crypto_topups` by `order_id`, if `credited=false` calls `credit_wallet` RPC with `price_amount_usd`, sets `credited=true`, status to `finished`. Idempotent.
  - Other statuses: update `status` column only.

## Frontend
- Remove `<PaymentTestModeBanner />` from `__root.tsx`.
- New `src/components/WalletBalanceBadge.tsx`: pill in header showing balance for authed users, click → `/wallet`.
- New route `src/routes/_authenticated.wallet.tsx`: shows balance, "Top up" presets ($10/$25/$50/$100 + custom), transaction history table, list of pending crypto top-ups with status.
- Top-up flow: user picks amount → calls `createTopupInvoice` → opens NOWPayments `invoice_url` in new tab → on return, wallet page polls/realtime-subscribes to `wallets` and `crypto_topups` and shows toast when credited.
- Replace `src/components/PromoteDialog.tsx`:
  - Show current wallet balance.
  - Two options (Featured $9.99 / Bump $2.99). If balance sufficient → "Pay with wallet" button calls `promoteWithWallet`. If insufficient → "Top up to continue" linking to `/wallet`.
  - Remove all Stripe imports.
- Admin (`src/routes/admin.index.tsx`) Payments tab: show wallet spends + crypto top-ups; add a "Top-ups" subview.

## Secrets needed
Will call `add_secret` for: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`. User gets these from nowpayments.io → Settings → API keys / IPN. They must set IPN callback URL in NOWPayments dashboard to `https://devads.lovable.app/api/public/payments/nowpayments-ipn`.

## Verification
- Migration applies cleanly; `credit_wallet` / `debit_wallet` RPCs work.
- `/wallet` renders, balance shows $0 for new user.
- Top-up creates invoice, redirect works; simulate IPN with curl → balance increments, transaction row appears.
- Insufficient balance blocks promotion; sufficient balance debits and applies promotion atomically.
- No `@stripe` imports remain (`rg "@stripe"` empty); build passes.

## Out of scope
- Auto-refund of failed promotions, multi-currency wallets, withdrawal/payout from wallet, referral credits.
