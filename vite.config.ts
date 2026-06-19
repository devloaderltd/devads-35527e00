// Default config = Cloudflare (used by Lovable preview + callescort24.lovable.app).
// For VPS / Node deployment, build with:
//   BUILD_TARGET=node bun run build
// then run: node .output/server/index.mjs
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNode = process.env.BUILD_TARGET === "node";

export default defineConfig(
  isNode
    ? ({
        cloudflare: false,
        tanstackStart: { server: { preset: "node-server" } },
      } as any)
    : {},
);
