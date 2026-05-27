## Goal
Make the success/error notifications (sonner toasts) feel polished and on-brand across the entire app — landing, user pages, and admin panel. They currently use sonner's default light theme, which clashes hard with the dark indigo/fuchsia UI (see screenshot: pale green "Saved" pill floating on a dark page).

Toasts are rendered from a single global `<Toaster />` mounted in `src/routes/__root.tsx`, and every `toast.success(...)` / `toast.error(...)` call across the app flows through `src/components/ui/sonner.tsx`. So this is a one-file styling pass — no call-site edits, no logic changes.

## Changes

**`src/components/ui/sonner.tsx`** — rebuild the wrapper:
- Dark glass surface tuned to the app palette: `bg-slate-950/85`, `backdrop-blur-xl`, subtle border `border-white/10`, soft layered shadow.
- Rounded `rounded-2xl`, generous padding, refined typography (title `text-slate-100 font-medium`, description `text-slate-400 text-sm`).
- Per-variant accent (left gradient bar + tinted icon ring, no full color flood):
  - success → emerald
  - error → rose
  - warning → amber
  - info → sky
  - loading → indigo (spinner)
- Replace default icons with crisp `lucide-react` icons (`CheckCircle2`, `XCircle`, `AlertTriangle`, `Info`, `Loader2`) inside a soft tinted circle.
- Smooth enter/exit (sonner's built-in `swipeDirections`, `duration: 3500`, `closeButton` styled to match).

**`src/routes/__root.tsx`** — small props tweak only:
- Keep `richColors={false}` (we own the styling now), `position="top-right"` on desktop / `top-center` on mobile via `mobileOffset`, `expand`, `visibleToasts={4}`, `theme="dark"`.

## Out of scope
- No changes to any `toast.success(...)` / `toast.error(...)` call sites.
- No new toast types, no copy changes, no replacement of the sonner library.
- No changes to non-toast dialogs/alerts.

## Verification
- Trigger a save in admin homepage editor → dark glass toast with emerald accent + check icon.
- Trigger a validation error on the post form → same shell with rose accent + x icon.
- Confirm both light and dark routes render identically (toaster is theme-locked to dark to match the app).
