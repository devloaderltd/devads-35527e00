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
      vite: {
        ssr: { noExternal: ["h3-v2"] },
        environments: {
          ssr: { resolve: { noExternal: ["h3-v2"] } },
        },
      },
    });
