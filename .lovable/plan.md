# Rename `devads` → `callescort24` (domain: `callescort24.org`)

The website itself is already branded **CallEscort24**. The remaining `devads` references are in deploy docs, VPS pathing, the cloud DB dump filename prefix, and a few stragglers in the app. This plan replaces them consistently and uses `callescort24.org` as the real domain everywhere (no more `example.com` placeholders).

## Scope of changes

### Deploy docs / runbooks
- `DEPLOY_VPS_CHECKLIST.md`
  - Title: `devads — One-Page VPS Deploy Checklist` → `callescort24 — …`
  - DNS examples: `devads.example.com` → `callescort24.org`, `api.callescort24.org`, `studio.callescort24.org`, `grafana.callescort24.org`
  - Env table examples (`DOMAIN`, `REPO`, `DUMP_FILE`) use `callescort24.org`, `git@github.com:you/callescort24.git`, `/root/callescort24-cloud-…dump`
  - Working dir: `/opt/devads` → `/opt/callescort24`
  - Off-server key filename: `devads-master.key` → `callescort24-master.key`
- `ROLLBACK.md`
  - All `DOMAIN=devads.example.com` → `DOMAIN=callescort24.org`
  - All `https://devads.example.com` / `studio.devads.example.com` → `https://callescort24.org` / `https://studio.callescort24.org`

### Scripts
- `scripts/cloud-db-dump.sh`
  - Output filename prefix `devads-cloud-…` → `callescort24-cloud-…`
  - Update the "NEXT STEPS" examples accordingly
- `scripts/check-auth-routes.ts`
  - Header comment `BASE_URL=https://devads.lovable.app` → `https://callescort24.org` (kept `devads.lovable.app` as a fallback isn't useful — use the real prod domain)
  - `BASE_URL` default → `https://callescort24.org`

### App stragglers
- `src/routes/lovable/email/transactional/send.ts`: `const SITE_NAME = "devads"` → `"CallEscort24"`
- `src/routes/admin.settings.tsx`: default origin `"https://devads.lovable.app"` → `"https://callescort24.org"`
- `vite.config.ts` line 1 comment: `devads.lovable.app` → `callescort24.lovable.app` (just a comment; functional behaviour unchanged)

## Out of scope (intentionally NOT touched)

- `supabase/config.toml` `project_id` and Lovable Cloud project id — these are immutable Lovable identifiers, not a rename target.
- Generated files: `src/routeTree.gen.ts` (auto-generated).
- Historical SQL migration filenames and migration body strings (renaming them would re-run / break migration history).
- The PM2 app name `callescort` in `ecosystem.config.cjs` — already correct.

## Technical notes

- After the rename, the canonical sample deploy command becomes:
  ```bash
  sudo DOMAIN=callescort24.org \
       EMAIL=you@callescort24.org \
       REPO=git@github.com:you/callescort24.git \
       APP_USER=callescort \
       DUMP_FILE=/root/callescort24-cloud-YYYYMMDD-HHMMSS.dump \
       bash scripts/vps/cli.sh deploy
  ```
- Verification after changes: `rg -n -i 'devads' .` should return only `.lovable/`, `supabase/migrations/`, and `src/routeTree.gen.ts` (none of which we're touching).

## Files changed (summary)

- edit `DEPLOY_VPS_CHECKLIST.md`
- edit `ROLLBACK.md`
- edit `scripts/cloud-db-dump.sh`
- edit `scripts/check-auth-routes.ts`
- edit `src/routes/lovable/email/transactional/send.ts`
- edit `src/routes/admin.settings.tsx`
- edit `vite.config.ts` (comment only)
