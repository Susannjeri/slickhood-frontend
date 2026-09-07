import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("failed community fund creation retains the complete draft", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions: ["manage_community_funds", "view_community_funds"] });
  let createRequests = 0;
  // The deployed build prefixes API paths with /api; local API builds may not.
  await page.route(url => /^\/(?:api\/)?community-funds$/.test(url.pathname), route => {
    if (route.request().method() === "POST") {
      createRequests++;
      expect(route.request().postDataJSON().contributorScope).toBe("ALL_OCCUPANTS");
      return route.fulfill({ status: 400, json: { success: false, description: "Check the property assignment" } });
    }
    return route.fulfill({ json: envelope([]) });
  });
  await page.route("**/account/list?**", route => route.fulfill({ json: envelope([{ id: 11, name: "Fund account", category: "COMMUNITY_FUND", active: true, verified: true, channel: "MPESA" }]) }));
  await page.goto("/dashboard/community-funds");
  await page.getByRole("button", { name: "New fund", exact: true }).click();
  const form = page.locator("form");
  const contributors = form.locator("select").nth(1);
  await expect(contributors).toHaveValue("ALL_OCCUPANTS");
  await contributors.selectOption("HOMEOWNERS");
  await contributors.selectOption("ALL_OCCUPANTS");
  await expect(contributors).toHaveValue("ALL_OCCUPANTS");
  await form.locator('input[type="number"]').nth(0).fill("10");
  await form.locator('input[type="number"]').nth(1).fill("10000");
  await form.locator('input[type="number"]').nth(2).fill("100");
  await form.locator('input:not([type]),input[type="text"]').nth(0).fill("Playground repairs");
  await form.locator('input:not([type]),input[type="text"]').nth(1).fill("Repair the communal playground");
  await expect(form.locator('option[value="11"]')).toHaveCount(1);
  await form.locator("select").last().selectOption("11");
  await page.getByRole("button", { name: "Save draft fund", exact: true }).click();
  await expect(page.getByText("Check the property assignment", { exact: true })).toBeVisible();
  await expect(form).toBeVisible();
  await expect(form.locator('input').filter({ visible: true }).first()).toHaveValue("10");
  await expect(form.locator('input[value="Playground repairs"]')).toBeVisible();
  expect(createRequests).toBe(1);
});
