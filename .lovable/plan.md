## Goal

Tighten validation on the post form, charge per-city to publish a new ad, let the publisher promote (bump/feature) at post time from wallet, and add a "Listing pricing" panel to admin settings.

## 1. Stricter validation on `src/routes/_authenticated.post.tsx`

**Age field** — repurpose as a numeric age (years), minimum 18.
- Swap `<Input>` for `<Input type="number" inputMode="numeric" min={18} max={99}>`
- Strip non-digits on change. Reject submit if not an integer ≥ 18.
- Update placeholder to `e.g. 25`, label stays "Age".
- DB column `item_age` already exists as `text`; store the digit string (no migration needed).

**Phone & WhatsApp** — accept digits only (plus leading `+` and single spaces/dashes for readability) and reject anything else **as the user types**.
- On change, run `value.replace(/[^\d+\s\-]/g, "")` so letters/symbols never appear in the field.
- Keep the existing `PHONE_RE` final-submit check but tighten the minimum to 7 digits after stripping non-digits.
- Same rule applied to the WhatsApp field when "Same as phone" is off.

## 2. Paid posting — $1.00 per city (configurable)

**Admin panel** (`/admin/settings`): add a new "Listing pricing" card under "Promotion pricing" with one field — **Listing post price** (USD, 0–9999, step 0.01). Saves to `site_settings.listing_post_price_usd`.

**Database migration**:
```sql
ALTER TABLE public.site_settings
  ADD COLUMN listing_post_price_usd numeric NOT NULL DEFAULT 1.00;
```

**New server function** `chargeListingPost` in `src/lib/wallet.functions.ts`:
- Input: `{ cityCount: number, listingGroupId: string }`
- Reads `listing_post_price_usd`, computes `total = price × cityCount`
- Calls `debit_wallet` RPC (existing); throws "Insufficient wallet balance — please top up." on failure
- Records a row in `payments` with `provider: "wallet"`, `promotion_type: null`
- Returns `{ charged, balance }`

**Post form CREATE path** (lines 405–436 of `_authenticated.post.tsx`):
- Before inserting listings, call `getListingPostPrice` (new GET serverFn) to show the user the total cost in a confirmation summary above the Submit button: `Posting to N cities — $X.XX will be deducted from your wallet.`
- On submit, call `chargeListingPost` **first**. If it throws insufficient-funds, show toast with a "Top up wallet" link to `/wallet` and abort.
- Only after successful debit, insert the listing rows.
- EDIT path: no charge (only new cities added during edit would charge — keep simple, no charge on edit for v1).

## 3. Promote-at-post section

New collapsible card in the post form, **CREATE mode only**, placed right above the Submit button:

```
┌─ Boost your listing (optional) ────────────────┐
│ Wallet balance: $X.XX                          │
│                                                │
│ ☐ Feature this listing — $9.99 / 7 days        │
│ ☐ Bump to top — $2.99                          │
│                                                │
│ Total: $A.AA  (post) + $B.BB (boosts) = $C.CC  │
└────────────────────────────────────────────────┘
```

- Pulls prices via `getPromotionPricing` + wallet balance via `getWallet`.
- After listings are created, loop selected boosts and call existing `promoteWithWallet({ listingId, type })` for **each created sibling** (per city).
- If wallet drops below total mid-flow, the per-call debit will throw and we surface the error with toast.

## 4. Files touched

- `supabase/migrations/<new>.sql` — add `listing_post_price_usd`
- `src/lib/wallet.functions.ts` — add `getListingPostPrice`, `chargeListingPost`
- `src/routes/admin.settings.tsx` — add "Listing pricing" card + field
- `src/routes/_authenticated.post.tsx` — validation tightening, paid-post flow, boost section

## Out of scope

- Refunds if post fails after debit (will rely on Supabase atomicity of insert)
- Per-category or per-country pricing tiers
- Charging on edit
- Changing existing `PromoteDialog` (still used post-publish from listing pages)
