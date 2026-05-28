/**
 * Playwright global setup — seeds a deterministic test user + admin via the
 * service role key. Idempotent: safe to re-run.
 *
 * Required env:
 *   PLAYWRIGHT_BASE_URL          (defaults to http://localhost:3000)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PLAYWRIGHT_USER_EMAIL        (default: e2e-user@example.com)
 *   PLAYWRIGHT_USER_PASSWORD     (default: e2e-Passw0rd!)
 *   PLAYWRIGHT_ADMIN_EMAIL       (default: e2e-admin@example.com)
 *   PLAYWRIGHT_ADMIN_PASSWORD    (default: e2e-AdminP@ss!)
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("[e2e] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — skipping seed");
    return;
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const seed = async (email: string, password: string, role: "user" | "admin") => {
    const { data: existing } = await admin.auth.admin.listUsers();
    let user = existing?.users.find((u) => u.email === email);
    if (!user) {
      const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      user = data.user ?? undefined;
    }
    if (user && role === "admin") {
      await admin.from("user_roles").upsert({ user_id: user.id, role: "admin" });
    }
  };

  await seed(process.env.PLAYWRIGHT_USER_EMAIL ?? "e2e-user@example.com",
             process.env.PLAYWRIGHT_USER_PASSWORD ?? "e2e-Passw0rd!", "user");
  await seed(process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "e2e-admin@example.com",
             process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "e2e-AdminP@ss!", "admin");
}
