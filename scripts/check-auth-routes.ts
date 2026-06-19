/**
 * scripts/check-auth-routes.ts
 *
 * Permission checks for /admin and /login plus the admin-only runDemoSeed
 * server fn. Hits the deployed site by default; override with BASE_URL.
 *
 * Usage:
 *   bun run check:auth
 *   BASE_URL=https://callescort24.org bun run check:auth
 *
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in env (or .env).
 * Rotates demo credentials via /api/public/seed-demo (bootstrap or with
 * x-seed-token=SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from "@supabase/supabase-js";

const BASE_URL = (process.env.BASE_URL ?? "https://callescort24.org").replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SEED_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(2);
}

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function assert(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function rotateDemo() {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (SEED_TOKEN) headers["x-seed-token"] = SEED_TOKEN;
  const res = await fetch(`${BASE_URL}/api/public/seed-demo`, { method: "POST", headers });
  if (!res.ok) throw new Error(`seed-demo failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    accounts: Array<{ email: string; password: string; role?: string }>;
  };
}

async function callServerFn(name: string, token: string | null, body: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/_serverFn/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  // 1. Anonymous /admin → no admin shell sentinel
  const adminAnon = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
  const adminHtml = await adminAnon.text();
  const hasAdminShell = /data-admin-shell|Admin dashboard|admin-sidebar/i.test(adminHtml);
  const looksLikeLogin = /login|sign in/i.test(adminHtml) || adminAnon.status >= 300;
  assert("Anonymous GET /admin does NOT render admin shell", !hasAdminShell && looksLikeLogin,
    `status=${adminAnon.status} hasShell=${hasAdminShell}`);

  // 2. Anonymous /login → login form
  const loginAnon = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginAnon.text();
  assert("Anonymous GET /login renders login form",
    loginAnon.ok && /sign in|log in|email/i.test(loginHtml),
    `status=${loginAnon.status}`);

  // 3. Rotate demo to get fresh creds
  let demo: { email: string; password: string } | null = null;
  let admin: { email: string; password: string } | null = null;
  try {
    const seeded = await rotateDemo();
    demo = seeded.accounts.find(a => !a.role) ?? null;
    admin = seeded.accounts.find(a => a.role === "admin") ?? null;
    assert("Rotated demo credentials via /api/public/seed-demo", !!demo && !!admin);
  } catch (e: any) {
    assert("Rotated demo credentials via /api/public/seed-demo", false, e.message);
    return;
  }

  // 4. Demo user perms
  const demoSb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  {
    const { data, error } = await demoSb.auth.signInWithPassword({ email: demo!.email, password: demo!.password });
    assert("Demo user sign-in", !error && !!data.session, error?.message);
    const token = data.session?.access_token ?? null;

    const roles = await callServerFn("getMyRoles", token, {});
    assert("Demo getMyRoles returns user-only (no admin)",
      roles.status === 200 && !/admin/.test(roles.body),
      `status=${roles.status}`);

    const denied = await callServerFn("runDemoSeed", token, {});
    assert("Demo cannot call runDemoSeed (rejected)",
      denied.status === 401 || denied.status === 403 || /forbidden|unauthorized/i.test(denied.body),
      `status=${denied.status}`);
  }

  // 5. Admin user perms
  const adminSb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  {
    const { data, error } = await adminSb.auth.signInWithPassword({ email: admin!.email, password: admin!.password });
    assert("Admin user sign-in", !error && !!data.session, error?.message);
    const token = data.session?.access_token ?? null;

    const roles = await callServerFn("getMyRoles", token, {});
    assert("Admin getMyRoles includes admin",
      roles.status === 200 && /admin/.test(roles.body),
      `status=${roles.status}`);

    const ok = await callServerFn("runDemoSeed", token, {});
    assert("Admin can call runDemoSeed",
      ok.status === 200 && /ok/.test(ok.body),
      `status=${ok.status}`);
  }

  // 6. /api/public/seed-demo without token must be rejected (admin already exists)
  const noToken = await fetch(`${BASE_URL}/api/public/seed-demo`, { method: "POST" });
  assert("/api/public/seed-demo without token is rejected once admin exists",
    noToken.status === 401, `status=${noToken.status}`);
}

main()
  .then(() => {
    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exit(failed.length ? 1 : 0);
  })
  .catch(e => {
    console.error("Fatal:", e);
    process.exit(2);
  });
