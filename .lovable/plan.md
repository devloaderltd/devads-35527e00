# Legal & compliance polish

## What already exists
- **Footer**: already lists Privacy, Terms, Cookies, About, Contact (top section + slim bottom bar). No DMCA link, no sitemap link.
- **Sitemap** (`src/routes/sitemap[.]xml.tsx`): already includes `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`. Missing `/dmca`.
- **Contact page**: has Zod validation + 3 channel cards + a contact form, but submit only opens `mailto:` and shows a toast — no in-page confirmation state.
- **Terms** (146 lines), **Privacy** (113), **Cookies** (90): exist, but Terms needs a fuller legal structure.
- **CookieConsent**: binary "Essential only" / "Accept all" stored as a single string in `localStorage`. No category granularity, no API for consumers to gate scripts.

## Changes

### 1. Granular cookie consent — `src/components/CookieConsent.tsx` + new `src/lib/cookie-consent.ts`
- New `cookie-consent.ts` module owns the consent contract:
  - Type: `{ essential: true; analytics: boolean; marketing: boolean; updatedAt: string; version: 1 }`.
  - `getConsent()` / `setConsent()` read/write `localStorage` (`marketly.cookie-consent.v1`).
  - `useConsent()` hook with a `storage` event listener so script gates react to changes.
  - `hasConsent(category)` helper for guard sites.
  - Dispatches a `CustomEvent('marketly:consent-change')` on save.
- `CookieConsent.tsx` rewrite:
  - Compact banner with **Accept all**, **Reject optional**, **Customize** actions.
  - **Customize** expands inline panel with 3 rows:
    - Essential (always on, disabled switch).
    - Analytics (off by default).
    - Marketing (off by default).
  - Reading order, copy and link to `/cookies` preserved.
  - Re-opens automatically if stored version < 1 (forward-compat).
- Migrate legacy `marketly.cookie-consent` value (`"accepted"` ⇒ all on, `"essential"` ⇒ only essential) once on read.
- Document: any optional script (analytics, ad pixels) must check `hasConsent('analytics' | 'marketing')` before loading. No optional scripts are loaded in this project today, so this is the gate, not a wiring change to existing scripts.

### 2. DMCA page — new `src/routes/dmca.tsx`
- Uses existing `LegalLayout`.
- Sections: Overview, Filing a takedown notice (statutory elements per 17 U.S.C. §512(c)(3)), Designated agent contact, Counter-notification, Repeat-infringer policy, Misrepresentation warning, Effective date.
- `head()`: title, description, og:title/description, og:url, canonical → `https://devads.lovable.app/dmca`.

### 3. Terms expansion — `src/routes/terms.tsx`
Keep existing tone/layout but ensure full coverage. Sections in final order:
1. Acceptance of Terms
2. Eligibility & account registration
3. Listings, prohibited items, and seller responsibilities
4. Buyer responsibilities & marketplace disclaimer (Marketly is not a party to transactions)
5. Fees, wallet credits & payments
6. User content license
7. Intellectual property & DMCA (link to `/dmca`)
8. Prohibited conduct
9. Termination & suspension
10. Disclaimers (AS IS, no warranty)
11. Limitation of liability
12. Indemnification
13. Governing law & dispute resolution (informal first, then arbitration; class-action waiver)
14. Changes to terms
15. Contact (link to `/contact`)

### 4. Contact confirmation — `src/routes/contact.tsx`
- Add `submitted` state. On successful Zod validation:
  - Still trigger `mailto:` for graceful fallback.
  - Replace the form with a **success card**: green check icon, "Message ready to send", instructs the user to confirm sending from their email client, and a **Send another message** button that resets state.
- Form keeps inline `<p role="alert">` per field for validation errors (in addition to the toast).

### 5. Footer — `src/components/Footer.tsx`
- **Legal** section: add **DMCA** link → `/dmca`.
- New **Resources** mini-column (or append to bottom bar) with a **Sitemap** link pointing to `/sitemap.xml` (rendered as a regular `<a>` since it's a server route, not a page route).
- Bottom slim bar: append DMCA + Sitemap to the existing Privacy / Terms / Cookies row.

### 6. Sitemap — `src/routes/sitemap[.]xml.tsx`
- Add `/dmca` to the static URL list.

## Out of scope
- Wiring real analytics/ads scripts (none exist today). The new consent helper is the gate that future scripts must call.
- Backend contact mailer (already falls back to `mailto:`).
- Translating legal copy — kept in English with a "consult your own counsel" tone.

## Files
- **new** `src/lib/cookie-consent.ts`
- **new** `src/routes/dmca.tsx`
- **edit** `src/components/CookieConsent.tsx`
- **edit** `src/routes/contact.tsx`
- **edit** `src/routes/terms.tsx`
- **edit** `src/components/Footer.tsx`
- **edit** `src/routes/sitemap[.]xml.tsx`
