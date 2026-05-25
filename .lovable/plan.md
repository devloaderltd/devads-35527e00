## Changes

### 1. `src/routes/listings.$id.tsx` (listing detail)
- **Details card**: add explicit "Age" row showing days since `created_at` (e.g. `12 days`). Keep existing "Posted" row (relative time). Rename "Views" → "Total ad views".
- **Remove Condition**: delete the Condition row in the Details card and the standalone condition chip in the right column.

### 2. `src/routes/_authenticated.post.tsx` (post ad form)
- Remove the Condition select field, its label, its state, and its inclusion in the insert payload (let the column fall back to its DB default `not_applicable`).

### Out of scope
- No DB migration — the `condition` column stays so existing listings and other code paths keep working.
- No change to search filters, cards, or anywhere else condition is read.

## Technical notes
- Age in days = `Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86_400_000)`, rendered as `${n} day${n===1?'':'s'}` (or `Today` when 0).
- Total ad views = `listing.view_count ?? 0` (same data, new label).