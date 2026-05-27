import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression for /admin/settings across mobile, tablet, and desktop.
 *
 * Requires an admin session. Provide one of:
 *   - PLAYWRIGHT_STORAGE_STATE: path to a Playwright storageState JSON
 *   - E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD: credentials for /admin/login
 *
 * Update baselines after intentional UI changes:
 *   bun run test:visual:update
 */

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-393", width: 393, height: 740 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
] as const;

async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    test.skip(true, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD or PLAYWRIGHT_STORAGE_STATE to run visual tests.");
    return;
  }
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin(\/|$)/);
}

test.describe("admin settings — visual regression", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.PLAYWRIGHT_STORAGE_STATE) {
      await loginAsAdmin(page);
    }
  });

  for (const vp of VIEWPORTS) {
    test(`settings page @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/admin/settings");
      await expect(page.getByRole("heading", { name: /site settings/i })).toBeVisible();
      // Let layout settle (fonts, async data).
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot(`admin-settings-${vp.name}.png`, {
        fullPage: true,
        mask: [page.locator("[data-vr-mask]")],
      });
    });
  }
});
