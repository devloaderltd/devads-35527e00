import { test, expect } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "e2e-admin@example.com";
const PASS = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "e2e-AdminP@ss!";

test.describe("Admin moderation", () => {
  test("admin can open the moderation queue and audit log", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASS);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/admin/moderation");
    await expect(page.getByRole("heading", { name: /moderation queue/i })).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: /audit/i })).toBeVisible();
  });
});
