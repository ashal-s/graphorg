import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("welcome page loads", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("heading", { name: /Company context for/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Sign in$/i }).first(),
    ).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    // CardTitle is a div (not a heading role) in the shared UI kit.
    await expect(page.getByText("Sign in to GraphOrg")).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByLabel(/^Password$/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Sign in$/i }),
    ).toBeVisible();
  });
});
