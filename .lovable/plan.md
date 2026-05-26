
## Goal

On the Post listing page:
1. Add **Phone number** and **WhatsApp number** inputs.
2. Replace the city `Select` with a **searchable combobox** that supports **multi-select** (one listing is duplicated per selected city).
3. Show both numbers on the **listing details** page.

## 1. Database (migration)

Add two nullable text columns to `listings`:
- `phone text`
- `whatsapp text`

Both validated client-side (E.164-ish, max 32 chars). No RLS changes needed (existing listing policies cover them).

## 2. Post listing page (`src/routes/_authenticated.post.tsx`)

- New inputs: **Phone number** (required) and **WhatsApp number** (optional, with a "Same as phone" checkbox to copy).
- Light validation: digits / `+`, spaces, dashes; 6–32 chars.
- Replace the City `Select` with a searchable **Command** combobox (shadcn `Command` + `Popover`), filtered by typed text. Supports **multiple** selections, shown as removable chips above the input. Country select stays.
- Submit flow: loop over selected city IDs and insert one listing per city (sharing title/description/photos). Photos are uploaded once per listing (re-upload per city is fine since storage cost is negligible; or we can upload once and reuse the same URLs for all duplicates — we'll reuse URLs to save bandwidth). Toast shows "Posted to N cities". Navigate to the first created listing.

## 3. Listing details page (`src/routes/listings.$id.tsx`)

- Fetch `phone` and `whatsapp` along with the listing.
- In the contact section, render two action buttons when present:
  - **Call** → `tel:+<phone>`
  - **WhatsApp** → `https://wa.me/<digits>`
- Keep existing seller email reveal as-is.

## 4. Technical notes

- Combobox: use existing `@/components/ui/command` + `@/components/ui/popover`. No new deps.
- Cities query already fetches up to 1000 per country — fine for client-side filtering.
- Numbers stored on listing (per user's choice), independent of profile phone.
- Types regenerate automatically after the migration.

## Files

- Migration: add `phone`, `whatsapp` columns to `listings`.
- Edit `src/routes/_authenticated.post.tsx`: new fields + multi-city combobox + duplicate-insert loop.
- Edit `src/routes/listings.$id.tsx`: select the new columns + render Call / WhatsApp buttons.
