// VPS / Node deployment build.
// The Cloudflare Workers target is disabled (`cloudflare: false`) so TanStack
// Start emits a standard Node server bundle at .output/server/index.mjs that
// you can run with `node .output/server/index.mjs` or under PM2.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: {
      entry: "server",
      preset: "node-server",
    },
  },
});
