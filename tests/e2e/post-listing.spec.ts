import { test, expect } from "@playwright/test";

/**
 * Post-listing flow — Preview → Edit → Post ad → listing live.
 *
 * Skipped by default. To run locally:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... \
 *   E2E_CATEGORY_NAME="Some Category" E2E_CITY_NAME="Some City" \
 *   E2E_COUNTRY=US \
 *   bunx playwright test tests/e2e/post-listing.spec.ts
 *
 * The test user MUST have enough wallet balance to cover one post fee.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const CATEGORY = process.env.E2E_CATEGORY_NAME;
const CITY = process.env.E2E_CITY_NAME;
const COUNTRY = (process.env.E2E_COUNTRY ?? "US") as "US" | "UK" | "CA";

const hasEnv = Boolean(EMAIL && PASSWORD && CATEGORY && CITY);

test.describe("Post listing — preview/edit/charge flow", () => {
  test.skip(
    !hasEnv,
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_CATEGORY_NAME, E2E_CITY_NAME to run.",
  );

  test("preview → edit → post ad publishes listing and clears draft", async ({ page }) => {
    // 1. Sign in.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByLabel(/password/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(me|dashboard|$)/, { timeout: 15_000 });

    // 2. Open the post form.
    await page.goto("/post");

    const originalTitle = `E2E preview ${Date.now()}`;
    const editedTitle = `${originalTitle} — edited`;

    await page.getByLabel(/title/i).first().fill(originalTitle);
    await page.locator("[contenteditable=true]").first().fill(
      "This is an end-to-end test listing description with enough characters.",
    );
    await page.getByLabel(/age/i).first().fill("25");
    await page.getByLabel(/phone/i).first().fill("+1 555 123 4567");

    // Country / city / category selection is UI-specific — rely on visible text.
    await page.getByText(COUNTRY, { exact: false }).first().click().catch(() => {});
    await page.getByText(CATEGORY!, { exact: false }).first().click();
    await page.getByText(CITY!, { exact: false }).first().click();

    // 3. Click Preview post (does NOT charge).
    await page.getByTestId("preview-post-btn").click();
    await expect(page.getByTestId("charge-confirmation")).toBeVisible();
    await expect(page.getByTestId("charge-amount")).toContainText("$");
    await expect(page.getByText(/USD/)).toBeVisible();

    // 4. Click Edit → form re-appears with state preserved.
    await page.getByTestId("preview-edit-btn").click();
    const titleField = page.getByLabel(/title/i).first();
    await expect(titleField).toHaveValue(originalTitle);

    // Edit the title.
    await titleField.fill(editedTitle);

    // 5. Preview again and confirm Post ad.
    await page.getByTestId("preview-post-btn").click();
    await expect(page.getByTestId("charge-confirmation")).toBeVisible();

    const confirmBtn = page.getByTestId("preview-confirm-btn");
    await expect(confirmBtn).toBeEnabled();

    // 6. Click once — button must immediately disable (no double-submit).
    await confirmBtn.click();
    await expect(confirmBtn).toBeDisabled();
    await expect(confirmBtn).toHaveAttribute("aria-busy", "true");
    await expect(confirmBtn).toContainText(/Charging|Posting/i);

    // 7. Wait for redirect to the live listing.
    await page.waitForURL(/\/listings\//, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();

    // 8. Draft must be cleared from localStorage after success.
    const draft = await page.evaluate(() => localStorage.getItem("post-listing-draft-v1"));
    expect(draft).toBeNull();
  });

  test("draft survives page refresh before posting", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByLabel(/password/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(me|dashboard|$)/, { timeout: 15_000 });

    await page.goto("/post");
    const draftTitle = `Draft survives ${Date.now()}`;
    await page.getByLabel(/title/i).first().fill(draftTitle);

    // Refresh — title should still be present.
    await page.reload();
    await expect(page.getByLabel(/title/i).first()).toHaveValue(draftTitle);

    // Clean up so test reruns don't pollute the draft.
    await page.evaluate(() => localStorage.removeItem("post-listing-draft-v1"));
  });
});
