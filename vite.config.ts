// VPS / Node deployment build.
// node-server preset emits .output/server/index.mjs (a real Node HTTP server
// that calls listen() on PORT). Run it with: node .output/server/index.mjs
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: {
      preset: "node-server",
    },
  },
});
