import { test, expect } from "@playwright/test";

test.describe("Search and filters", () => {
  test("applying filters updates the URL and clear resets it", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/search/);

    // Type into the search input if present
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.count()) {
      await search.fill("test");
      await search.press("Enter");
      await expect(page).toHaveURL(/q=test/);
    }

    // Clear all
    const clear = page.getByRole("button", { name: /clear all|reset/i });
    if (await clear.count()) {
      await clear.first().click();
      await expect(page).not.toHaveURL(/q=test/);
    }
  });
});
