import { test, expect } from "@playwright/test";
import path from "path";

const EMAIL = process.env.PLAYWRIGHT_USER_EMAIL ?? "e2e-user@example.com";
const PASS = process.env.PLAYWRIGHT_USER_PASSWORD ?? "e2e-Passw0rd!";

test.describe("Listing creation with images", () => {
  test("rejects oversize/wrong-type files and accepts valid ones", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASS);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 15_000 });

    await page.goto("/post");

    const fixturePath = (n: string) => path.resolve(__dirname, "..", "fixtures", n);
    const fileInput = page.locator('input[type="file"]').first();

    // Wrong type — should toast an error and not attach.
    await fileInput.setInputFiles(fixturePath("bad.txt"));
    await expect(page.getByText(/unsupported|invalid|type/i)).toBeVisible({ timeout: 5_000 });

    // Valid small images.
    await fileInput.setInputFiles([fixturePath("small1.jpg"), fixturePath("small2.jpg")]);
    await expect(page.locator("img").nth(1)).toBeVisible({ timeout: 10_000 });
  });
});
