import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./admin-middleware";
import { runSeedDemo } from "./seed-demo.server";

export const runDemoSeed = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    return await runSeedDemo();
  });
