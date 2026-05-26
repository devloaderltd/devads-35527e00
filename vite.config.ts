import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = process.env.BUILD_TARGET === "vercel";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  cloudflare: isVercel ? false : undefined,
  vite: isVercel
    ? {
        ssr: {
          noExternal: true,
          target: "node",
        },
      }
    : undefined,
});
