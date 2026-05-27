# Visual regression tests

Opt-in Playwright suite guarding the admin settings page layout against
overflow regressions.

## Run

```bash
# 1. Start the app (separate terminal)
bun run dev

# 2. Provide admin credentials (one-time)
export E2E_ADMIN_EMAIL=admin@example.com
export E2E_ADMIN_PASSWORD=...

# 3. First-time baseline capture
bun run test:visual:update

# 4. Regular run
bun run test:visual
```

Baselines live in `tests/visual/__screenshots__/` and should be committed.

## Updating baselines

After an intentional layout change, re-run `bun run test:visual:update` and
commit the new PNGs alongside the code change. Reviewers diff the PNGs to
verify the change is intentional.

## Masking

Add `data-vr-mask` to any element with time- or session-dependent content
(timestamps, user-specific previews) so it's blanked out before the
screenshot is compared.
