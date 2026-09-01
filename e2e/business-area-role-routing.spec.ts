import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

test("landlord cannot open estate-management operator workspace", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_estate", "view_property", "view_lease"],
  });

  await page.goto("/dashboard/estate");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Estate Management" })).toHaveCount(0);
});

test("landlord cannot open property-sale-management operator workspace", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_sale_pipeline", "view_property", "view_lease"],
  });

  await page.goto("/dashboard/sales");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Property Sale Management" })).toHaveCount(0);
});

test("estate manager can open the estate-management operator workspace", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_estate", "manage_estate"],
  });
  await page.route("**/estate/ownership**", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: { success: true, data: [] } }));

  await page.goto("/dashboard/estate");

  await expect(page.getByRole("heading", { name: "Estate Management" })).toBeVisible();
});

