## Migrate deployment from Cloudflare to Vercel

### Context

Today the app is built by `@cloudflare/vite-plugin` (auto-loaded by `@lovable.dev/vite-tanstack-config`) which produces a Cloudflare Worker bundle in `dist/`. Vercel doesn't know how to serve that, which is why every route 404s.

The server entry (`src/server.ts`) already exports a standard `fetch(request, env, ctx)` handler — Web-standard, runtime-agnostic. We just need to package it for Vercel instead of Cloudflare.

Important caveat: Lovable's own preview/published pipeline still expects the Cloudflare build. To keep Lovable previews working **and** deploy to Vercel, we'll keep the default Vite build for Lovable and add a **separate** Vercel build path. If you don't need Lovable preview anymore, we can drop the dual setup.

### Approach

Vercel uses the **Build Output API** (`.vercel/output/` directory). We'll generate it with a post-build script that:

1. Runs Vite in a Vercel-targeted mode (Cloudflare plugin disabled).
2. Outputs client assets to `.vercel/output/static/`.
3. Wraps the server `fetch` handler as a Vercel **Edge Function** at `.vercel/output/functions/_ssr.func/` (Edge runtime matches the fetch-handler shape we already have — no Node rewrites needed for server functions).
4. Writes `.vercel/output/config.json` routing all non-static requests to the SSR function.

### Steps

1. **Add Vercel build script**
   - New file `scripts/build-vercel.mjs` that:
     - Sets an env flag (e.g. `BUILD_TARGET=vercel`).
     - Runs `vite build`.
     - Copies `dist/client/*` → `.vercel/output/static/`.
     - Copies `dist/server/*` → `.vercel/output/functions/_ssr.func/`.
     - Writes `.vc-config.json` inside the function dir declaring Edge runtime + entrypoint.
     - Writes `.vercel/output/config.json` with `{ version: 3, routes: [{ handle: "filesystem" }, { src: "/.*", dest: "/_ssr" }] }`.
   - Add `package.json` script: `"build:vercel": "node scripts/build-vercel.mjs"`.

2. **Conditionally disable Cloudflare plugin for Vercel builds**
   - Update `vite.config.ts` to pass `cloudflare: process.env.BUILD_TARGET === "vercel" ? false : undefined` so Lovable's build keeps working unchanged.

3. **Recreate `vercel.json`**
   - Minimal config:
     ```json
     { "buildCommand": "bun run build:vercel", "framework": null, "regions": ["iad1"] }
     ```

4. **Document required Vercel env vars** (you'll need to add these in Vercel dashboard):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `LOVABLE_API_KEY` (for AI features — note: this is provisioned by Lovable; if you leave Lovable hosting you may lose access to the gateway)
   - `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
   - `CRON_TRIGGER_SECRET`

5. **Verify locally**
   - Run `bun run build:vercel`, inspect `.vercel/output/` structure.
   - Push and let Vercel deploy.

### Risks / things to know

- **`LOVABLE_API_KEY` won't work outside Lovable.** Your AI features (`src/lib/ai.functions.ts`) depend on the Lovable AI Gateway. On Vercel you'll need to switch to a direct provider (OpenAI/Gemini/etc.) with your own API key, or keep AI calls on the Lovable URL.
- **Edge runtime constraints** match Cloudflare Workers, so most code will port cleanly. If any server function uses Node-only APIs they'd need rewriting.
- **Cron**: After deploy, point your third-party cron service at the new Vercel URL's `/api/public/cron/*` routes (or keep using the Lovable URL — either works once both are live).
- **Cost/complexity**: You'll be maintaining two deployment targets unless you fully cut over from Lovable hosting.

### Files to be created/modified

- `scripts/build-vercel.mjs` (new)
- `vite.config.ts` (modified — conditional cloudflare disable)
- `vercel.json` (new)
- `package.json` (new script)
