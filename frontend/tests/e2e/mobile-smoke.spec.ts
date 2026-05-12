import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBeFalsy();
}

test("platform owner login is usable on mobile", async ({ page }) => {
  await page.goto("/platform/admin");
  await expect(page.getByRole("button", { name: /giriş|login|تسجيل/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("signup page renders without mobile overflow", async ({ page }) => {
  const response = await page.goto("/signup");
  expect(response?.ok()).toBeTruthy();
  await page.waitForLoadState("domcontentloaded");
  await expectNoHorizontalOverflow(page);
});
