import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";
import { runSeedDemo } from "./seed-demo.server";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(`Role check failed: ${error.message}`);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

export const runDemoSeed = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    return await runSeedDemo();
  });
