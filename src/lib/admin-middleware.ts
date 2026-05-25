import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server middleware that requires the caller to be an authenticated admin.
 * Composes on top of requireSupabaseAuth: validates the JWT, then checks
 * the user_roles table for an 'admin' row using the service-role client.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(`Admin check failed: ${error.message}`);
    if (!data) throw new Error("Forbidden: admin role required");
    return next({ context: { ...context, isAdmin: true } });
  });
