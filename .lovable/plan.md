# Edit Listing Polish + Beautiful Loading System

## 1. Cover photo selector (edit mode)
In `_authenticated.post.tsx`, on each image tile (existing + new) add a "Set as cover" button (star icon, top-left). In edit mode:
- Clicking "Set as cover" reorders the array so the chosen image becomes `sort_order = 0`, others shift down.
- The current cover shows a filled star + "Cover" badge.
- Works for both already-saved images and newly added (not-yet-uploaded) files.

## 2. Drag-and-drop reordering (edit mode)
- Add `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, touch-friendly, works on the 393px mobile viewport the user is on).
- Wrap the photos grid in a `SortableContext`. Each tile becomes a `useSortable` item with a drag handle (grip icon) visible on hover/long-press.
- Reordering updates a unified array `[...existingImages, ...newFiles]` with stable IDs (`url` for existing, generated `id` for files).
- On "Save changes": persist new `sort_order` for existing rows via `UPDATE listing_images SET sort_order = $n WHERE id = $id` (batched), and assign sort orders to newly uploaded images so the final order matches what the user arranged.
- Non-edit mode keeps the current simple grid (no drag).

## 3. Multi-city edit support
Currently edit mode collapses to single city. Change to:
- Load all sibling listings (same `user_id` + same `title` + same `created_at` window? — too fragile). **Better approach:** add a `listing_group_id` (uuid) column to `listings` so multi-city posts share a group. Migration:
  - `ALTER TABLE listings ADD COLUMN listing_group_id uuid;`
  - Backfill: set `listing_group_id = id` for existing rows.
  - When creating multi-city, generate one uuid and stamp all siblings.
- In edit mode, fetch all listings in the same group owned by the user. Show the city picker as multi-select preloaded with current cities.
- On save:
  - For cities still selected → UPDATE existing sibling (title, desc, age, phone, etc.).
  - For newly added cities → INSERT new sibling with same `listing_group_id` and copy images.
  - For deselected cities → DELETE sibling (with confirmation: "This will remove the listing from N cities").
- Images: edits to images apply to ALL siblings in the group (re-sync `listing_images` for each sibling) — keeps the group consistent.

## 4. Stronger inline validation
Replace toast-only errors with field-level inline errors:
- Add an `errors` state `{ title?, description?, itemAge?, phone?, whatsapp?, category?, city?, photos? }`.
- Validate on blur + on submit. Show red border + `<p className="text-xs text-destructive">` under each field.
- Rules: title 3–140 chars, description min 10 chars (strip HTML), age required ≤60 chars, phone matches `PHONE_RE`, whatsapp (if not same) matches `PHONE_RE`, category required, ≥1 city, photos optional but if any new file > 5MB → error.
- Submit button stays enabled but on click runs full validation and scrolls to first error.
- Keep a small toast for the overall "Please fix the highlighted fields" summary.

## 5. Beautiful global loading system
Replace every plain `Loading…` text with a branded loader.
- Create `src/components/BrandLoader.tsx`:
  - Animated gradient orb (primary → purple) with a pulsing ring.
  - Optional `label` prop (default "Loading").
  - Variants: `inline` (small, beside text), `block` (centered in a panel), `page` (full viewport with subtle backdrop blur).
  - Uses Tailwind + `motion/react` for smooth fade/scale; respects `prefers-reduced-motion`.
- Create `src/components/ListingsSkeleton.tsx` — shimmer cards matching `ListingCard` layout, used in `my-listings`, `search`, `favorites`, etc.
- Wire it in:
  - `_authenticated.tsx` layout loader → `<BrandLoader variant="page" />`
  - `_authenticated.my-listings.tsx` → `<ListingsSkeleton count={4} />` instead of "Loading…"
  - `_authenticated.post.tsx` (edit prefill) → `<BrandLoader variant="block" label="Loading listing" />`
  - `listings.$id.tsx`, `sellers.$id.tsx`, `compare.tsx`, `_authenticated.verify.tsx`, and admin pages that show "Loading…" — swap to `<BrandLoader variant="block" />`.
- Add a thin top progress bar component (`RouteProgress`) wired to router pending events in `__root.tsx` for navigation feedback.

## Technical details
- New dep: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Migration: add `listing_group_id uuid` to `listings`, backfill, optional index.
- Touch files:
  - `src/routes/_authenticated.post.tsx` (cover, drag, multi-city, validation)
  - `src/components/BrandLoader.tsx` (new)
  - `src/components/ListingsSkeleton.tsx` (new)
  - `src/components/RouteProgress.tsx` (new)
  - `src/routes/__root.tsx` (mount RouteProgress)
  - `src/routes/_authenticated.tsx`, `_authenticated.my-listings.tsx`, `listings.$id.tsx`, `sellers.$id.tsx`, `compare.tsx`, `_authenticated.verify.tsx`, `_authenticated.debug.session.tsx`, `admin.kyc.tsx`, `admin.insights.tsx`, `admin.audit.tsx`, `admin.users.tsx` (replace "Loading…")
  - Supabase migration for `listing_group_id`.

## Out of scope
- Header avatar dropdown, notifications wiring, other dashboard polish from the prior plan (separate pass).
- Admin loaders beyond a simple text swap.

Approve and I'll implement.
