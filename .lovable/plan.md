## Changes

### 1. DB migration
- Add `item_age text NOT NULL DEFAULT ''` column on `public.listings`. New listings will be required to provide a value at the form layer; default empty string keeps existing rows valid.

### 2. `src/routes/_authenticated.post.tsx`
- Add `itemAge` state + a free-text `<Input>` field labeled "Item age" (placeholder: `e.g. 2 years, 6 months, brand new`).
- Validate on submit: required, trimmed length 1–60 chars; show toast on failure.
- Include `item_age: itemAge.trim()` in the insert payload.

### 3. `src/routes/listings.$id.tsx`
- In the Details card, add an "Item age" row above the existing "Age" (listing age in days) row, shown only when `listing.item_age` is non-empty.
- Keep the listing-age-in-days row I added previously (now clearly the "ad age").

## Out of scope
- No search filter on item age (free text isn't filterable cleanly).
- No edit-flow changes beyond the post form.

## Technical notes
- Column type `text` because the value is free-form ("2 years", "brand new").
- Length bounded to 60 chars client-side; we won't add a CHECK constraint to keep DB flexible.