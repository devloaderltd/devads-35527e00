## Issues

1. **Double sidebar on `/admin/kyc`** — `src/routes/admin.tsx` already wraps every admin child route in `<AdminShell>` (line 82), but `src/routes/admin.kyc.tsx` wraps its own content in `<AdminShell>` again, producing two stacked headers/sidebar triggers.

2. **Unreadable textarea on `/admin/maintenance`** — The "Message shown to visitors" `<Textarea>` uses `bg-slate-900/50` without an explicit text/placeholder color, so it inherits the default near-black foreground on top of the dark admin background. The text in the field is effectively invisible.

## Fix

1. **`src/routes/admin.kyc.tsx`**
   - Remove the `<AdminShell>` wrapper and its import.
   - Return the page content directly (header + tabs + cards) so it renders inside the parent admin layout's single shell.
   - Also update the page header text colors so they read on dark (`text-white` / `text-slate-400`) instead of inheriting muted dark-on-dark — same treatment used by other admin pages.

2. **`src/routes/admin.maintenance.tsx`**
   - Update the maintenance-message `<Textarea>` className to include readable text + placeholder colors on dark, e.g. `bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500`.

No other files, no schema or server changes.
