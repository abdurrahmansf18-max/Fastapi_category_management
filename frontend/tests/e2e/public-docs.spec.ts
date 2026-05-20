import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBeFalsy();
}

test("public docs home is responsive and filterable", async ({ page }) => {
  const response = await page.goto("/d/demo");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Demo Docs" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Introduction/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByPlaceholder("Filter docs").fill("api");
  await expect(page.getByRole("button", { name: /API Reference/i })).toBeVisible();
  await expect(page.getByText("Authentication")).toBeVisible();
});

test("public live search supports keyboard navigation", async ({ page }) => {
  await page.goto("/d/demo");
  const search = page.getByPlaceholder("Search category, heading, or content");
  await search.fill("install");
  await expect(page.getByRole("option", { name: /Install the SDK/i })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/d\/demo\/getting-started\/intro\/install$/);
  await expect(page.getByRole("heading", { name: "Install the SDK" })).toBeVisible();
});

test("public detail page renders article tools without overflow", async ({ page }) => {
  await page.goto("/d/demo/getting-started/intro/install");
  await expect(page.getByRole("heading", { name: "Install the SDK" })).toBeVisible();
  await expect(page.getByText("Table of contents")).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy code/i })).toBeVisible();
  await expect(page.getByText("Was this page helpful?")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("public docs honor rtl locale", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "NEXT_LOCALE",
      value: "ar",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/d/demo");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
});
