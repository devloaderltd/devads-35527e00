
## Problem

"Failed to fetch dynamically imported module: …/assets/listings.\_id-DQCBhCjr.js" — a classic stale-chunk error. After we redeploy, every JS chunk gets a new content hash. A user with the previous version still open tries to lazy-load a route chunk by its old hash, which no longer exists on the CDN, so the dynamic `import()` rejects and the root `errorComponent` shows "Something went wrong". A manual refresh loads the new HTML (with new chunk hashes) and everything works.

This will keep happening on every deploy unless we handle it explicitly. It is not a code bug in `listings.$id.tsx`.

## Fix

Detect chunk-load failures and recover automatically — with a one-shot guard so we never loop.

### 1. `src/lib/chunk-reload.ts` (new helper)

- `isChunkLoadError(error)` — true when the message matches any of:
  - `Failed to fetch dynamically imported module`
  - `Importing a module script failed`
  - `error loading dynamically imported module`
  - `ChunkLoadError`
  - `Loading chunk` … `failed`
- `reloadOnceForChunkError()` — uses `sessionStorage` key `chunk-reload-attempted` so we only force-reload once per session; calls `location.reload()` (cache-busted by appending `?_r=<timestamp>` to current URL via `location.replace`).

### 2. `src/routes/__root.tsx` — `ErrorComponent`

Before rendering the fallback, if `isChunkLoadError(error)` and we haven't already attempted recovery, call `reloadOnceForChunkError()` from a `useEffect` and render a small "Updating…" message instead of the scary error UI. If the reload already happened (storage flag set) and we still get the error, fall through to the normal fallback so we don't loop.

### 3. `src/lib/error-reporter.ts` — `installErrorReporter`

The global `unhandledrejection` listener also catches these. Add the same `isChunkLoadError` check and trigger `reloadOnceForChunkError()` so users get recovered even if the rejection bubbles before TanStack's error boundary catches it. Skip reporting these to `/api/public/client-errors` (they're noise, not real bugs).

### Why this is safe

- Single sessionStorage-guarded reload — no infinite refresh loop.
- Only triggers on the specific dynamic-import failure messages, not generic errors.
- After the reload, browser fetches the fresh `index.html` with new chunk hashes and everything works.

### Out of scope

No router/route changes, no server changes, no build-config changes. Pure client-side recovery.
