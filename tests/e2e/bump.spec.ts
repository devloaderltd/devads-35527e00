import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Bump payment hardening — end-to-end checks.
 *
 * These tests verify the security invariant that `bumped_at` can only be set
 * via the paid bump flow (apply_paid_bump SQL function). They require:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - E2E_TEST_LISTING_ID  (an existing listing to attempt bumping)
 *
 * Skipped automatically when env vars are missing so local/CI runs without
 * credentials pass cleanly.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_LISTING = process.env.E2E_TEST_LISTING_ID;

const hasEnv = Boolean(SUPABASE_URL && SERVICE_ROLE && TEST_LISTING);

test.describe("Bump payment hardening (DB-level)", () => {
  test.skip(!hasEnv, "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_LISTING_ID to run.");

  test("direct bumped_at update is blocked by guard trigger and logged", async () => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const beforeAudit = await admin
      .from("bump_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", TEST_LISTING!)
      .eq("outcome", "unauthorized");

    const { error } = await admin
      .from("listings")
      .update({ bumped_at: new Date().toISOString() })
      .eq("id", TEST_LISTING!);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/bumped_at can only be set via paid bump flow/i);

    const afterAudit = await admin
      .from("bump_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", TEST_LISTING!)
      .eq("outcome", "unauthorized");

    expect((afterAudit.count ?? 0)).toBeGreaterThan(beforeAudit.count ?? 0);
  });

  test("apply_paid_bump succeeds and writes paid audit row", async () => {
    test.skip(!process.env.E2E_TEST_USER_ID, "Set E2E_TEST_USER_ID (must own the test listing) and have wallet credit.");
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.rpc("apply_paid_bump", {
      _user_id: process.env.E2E_TEST_USER_ID!,
      _listing_id: TEST_LISTING!,
      _amount: 0.01,
      _description: "e2e test bump",
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: true });

    const { data: listing } = await admin.from("listings").select("bumped_at").eq("id", TEST_LISTING!).single();
    expect(listing?.bumped_at).not.toBeNull();
  });
});
