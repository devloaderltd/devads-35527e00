## Problem

The Lovable preview shows the branded error page. Worker logs show:
`Error: No such module "h3-v2". imported from "server.js"`

`h3-v2` is being externalized instead of bundled into the Workers SSR output. Comparing against the last-known-good commit (`86becaa`):

- **Original `vite.config.ts`** only set `tanstackStart: { server: { entry: "server" } }` — no `cloudflare` key.
- **Current `vite.config.ts`** always passes `cloudflare: isVercel ? false : undefined`. The Lovable config helper treats passing `cloudflare: undefined` differently from omitting the key, which changes how h3-v2 gets resolved in the Workers build.
- **Original `src/server.ts`** used the dynamic `import("@tanstack/react-start/server-entry")` pattern and worked fine on Cloudflare. My previous "fix" to make it static was not the real issue.

## Plan

1. **`vite.config.ts`** — branch the entire config so the Lovable path is byte-identical to the original (no `cloudflare` key, no `vite` key), and the Vercel path keeps `cloudflare: false`, `ssr.noExternal: true`, `target: "node"`.

   ```ts
   import { defineConfig } from "@lovable.dev/vite-tanstack-config";

   const isVercel = process.env.BUILD_TARGET === "vercel";

   export default isVercel
     ? defineConfig({
         tanstackStart: { server: { entry: "server" } },
         cloudflare: false,
         vite: { ssr: { noExternal: true, target: "node" } },
       })
     : defineConfig({
         tanstackStart: { server: { entry: "server" } },
       });
   ```

2. **`src/server.ts`** — restore the original dynamic-import shape (it worked on Cloudflare originally and is also fine for the Vercel Node bundle since `ssr.noExternal` + `target: "node"` will inline it).

3. Leave `vercel.json`, `scripts/build-vercel.mjs`, and the `build:vercel` script untouched.

## Verification

- Lovable preview at `/` loads the real homepage (not the branded error page).
- Worker logs no longer show `No such module "h3-v2"`.
- `bun run build:vercel` still produces a working `.vercel/output/` tree.
