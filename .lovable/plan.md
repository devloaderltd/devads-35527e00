## Scope

Five focused improvements on top of the existing admin polish, plus re-setting up Lovable Emails in the new workspace the project was transferred into.

## 1. Manual "Refresh health" button on dashboard HealthStrip

File: `src/routes/admin.index.tsx`

- Add a small icon button to the top-right of `HealthStrip` (next to the section title).
- On click: `queryClient.invalidateQueries({ queryKey: ['admin','system-health'] })` and any related health keys, with a spinning `RefreshCw` while `isFetching` is true.
- Tooltip "Refresh health". Disabled state while refetching. No layout shift.
- Keep the existing "Refresh all" button in `HeroStrip` unchanged — this one is health-only.

## 2. Skeleton + error fallback audit across every admin page

Verify and fix every route under `src/routes/admin.*.tsx` so all use the same pattern:
- Pending → `<RowSkeleton rows={n} />` (or `<CardGridSkeleton />` for tiles)
- Error → `<ErrorFallback ... onRetry={() => refetch()} />`
- Empty → `<EmptyState ... />`

Pages to verify (in addition to the ones already done): `admin.reports.tsx`, `admin.debug.tsx`, `admin.audit.tsx`, `admin.activity.tsx`, `admin.banners.tsx`, `admin.broadcasts.tsx`, `admin.categories.tsx`, `admin.cities.tsx`, `admin.homepage.tsx`, `admin.insights.tsx`, `admin.maintenance.tsx`, `admin.moderation.tsx`, `admin.reviews.tsx`, `admin.settings.tsx`, `admin.threads.tsx`. Touch only the loading/error/empty branches — column structure and queries stay as-is.

## 3. Unique gradient IDs per chart (Recharts conflict fix)

File: `src/routes/admin.index.tsx`

- Recharts inlines `<defs>` into a shared SVG layer; duplicate IDs like `lineFill` cause the wrong gradient to render on the second chart.
- Refactor each chart to generate a stable unique id (e.g. `useId()` prefix + suffix `-area`, `-bar`, `-glow`) and reference it via `url(#${id})` in both `<linearGradient>` and the consuming `<Area>`/`<Bar>` `fill`.
- Apply to: signups area, listings area, revenue bars, categories bars, funnel bars.

## 4. Smarter `ErrorFallback`

File: `src/components/admin/Skeletons.tsx`

- Extend props: `isRetrying?: boolean`, optional `hint?: string`.
- While `isRetrying`, swap the `RefreshCw` icon for a spinning loader, change label to "Retrying…", and disable the button.
- Improve default copy: derive a friendlier message from common error shapes (network, 401/403, 5xx, timeout) instead of raw `error.message`.
- Update all call sites to pass `isRetrying={query.isFetching && query.isError}` so users get visible feedback when they click Retry.

## 5. Email setup in the new workspace

The project was transferred and the new workspace has **no email domain configured**. Auth + transactional emails won't send until a sender domain is set up. Plan:

1. User opens the email setup dialog and adds their sender subdomain (e.g. `notify.callescort.devloader.com`). NS records are added at the registrar; Lovable manages the rest.
2. Once the domain is registered (DNS can still be verifying), re-scaffold the auth email templates so the existing custom templates in `src/lib/email-templates/*` are wired to this workspace's `auth-email-hook` server route.
3. Re-run email infra setup so the pgmq queues, `process-email-queue` cron, and Vault service-role key exist on the new workspace's Cloud project.
4. Confirm transactional sending still works (the existing `src/routes/lovable/email/transactional/send.ts` + `registry.ts` stay — only the workspace-side credentials change). Update `SENDER_DOMAIN` in the transactional route if the new subdomain differs from the previous one.
5. Tell the user to monitor **Cloud → Emails** for DNS verification; sends resume automatically once active.

The setup dialog button will appear in the response after this plan is approved.

## Out of scope

No new admin features, no schema changes, no chart library swap, no changes to existing email templates' content.

## Files

**Edited**
- `src/routes/admin.index.tsx` (refresh health button, unique gradient ids)
- `src/components/admin/Skeletons.tsx` (ErrorFallback upgrade)
- All `src/routes/admin.*.tsx` pages still using ad-hoc loading/error text
- `src/routes/lovable/email/transactional/send.ts` (only if `SENDER_DOMAIN` needs updating)

**No new files.**
