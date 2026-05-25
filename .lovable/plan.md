## Goal
On first visit to the homepage, prompt the visitor to pick a city. Persist the selection and only show listings (and category/featured/recent feeds) after a city is chosen. Selected city should filter all homepage listings and remain changeable from the header.

## UX flow
1. First-time visitor lands on `/` → a centered, non-dismissable city picker modal appears over a dimmed hero. No listing grids render underneath (skeleton or empty state hidden behind the modal).
2. User searches/selects a city → modal closes, city is saved to `localStorage` (`marketly.cityId`), homepage queries refetch scoped to that city.
3. Returning visitor with a saved city → modal does NOT appear; homepage loads listings filtered by that city immediately.
4. Header gets a city chip ("📍 Austin ▾") that opens the same picker so users can change city anytime. "Change city" also clears and reopens the modal.

## Technical details

### New component: `src/components/CitySelectorDialog.tsx`
- Shadcn `Dialog` (or `Command` inside Dialog) listing cities from `cities` table grouped by country/region.
- Search input filtering by `name`/`region`.
- On select: call `setCity(cityId, cityName)` from context.
- `open` controlled by parent; `dismissable={false}` for first-visit case, dismissable when triggered from header.

### New context: `src/lib/city-context.tsx`
- Provides `{ cityId, cityName, setCity, clearCity }`.
- Reads/writes `localStorage` keys `marketly.cityId` and `marketly.cityName`.
- Hydrates on mount (SSR-safe: initial state null, sync from localStorage in `useEffect`).
- Wrap app in `__root.tsx`.

### Homepage changes (`src/routes/index.tsx`)
- Read `cityId` from context.
- Show `<CitySelectorDialog open={!cityId} dismissable={false} />` when no city.
- Listings `useQuery` key becomes `["listings","home", cityId]`, `enabled: !!cityId`, query adds `.eq("city_id", cityId)`.
- While no city: render hero/categories shell but skip listing sections (or show "Select a city to see ads").

### Header (likely `src/components/Header.tsx` or in `__root.tsx`)
- Add city chip button showing current city name (or "Select city"). Clicking opens the picker dialog (dismissable=true).

### No DB changes
- `cities` table and `listings.city_id` already exist. No migration needed.
- Logged-in users' `profiles.city_id` is unrelated; we keep this purely client-side for now (works for anonymous visitors too).

## Out of scope
- Saving city to profile for logged-in users (can be added later).
- Filtering `/search` route by the selected city (only homepage per request).
- Geo-IP auto-detection.
