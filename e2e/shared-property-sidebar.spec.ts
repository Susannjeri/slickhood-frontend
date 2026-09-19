import { expect, test, type Page } from "@playwright/test";
import { authenticated, envelope } from "./support";

async function propertyOverview(page: Page, features: string[]) {
  await page.route("**/subscription/overview**", route => route.fulfill({
    json: envelope([{ effectiveFeatures: features }]),
  }));
  await page.route("**/dash/totals**", route => route.fulfill({ json: envelope([{}]) }));
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));
}

test("a shared estate plan displays the complete rental workspace for a Landlord role", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["create_property", "view_property", "create_unit", "view_active_lease"],
  });
  await propertyOverview(page, ["PROPERTY_RENTALS", "ESTATE_MANAGEMENT", "PROPERTY_SALES"]);

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Properties", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("link", { name: "Rentals", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Leases", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Estate Management", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Property Sale Management", exact: true })).toHaveCount(0);
});

test("a shared sales plan displays only estate functions for an Estate Manager role", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["create_property", "view_property", "create_unit", "view_estate"],
  });
  await propertyOverview(page, ["PROPERTY_RENTALS", "ESTATE_MANAGEMENT", "PROPERTY_SALES"]);

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Properties", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("link", { name: "Create Unit", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rentals", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Estate Management", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Property Sale Management", exact: true })).toHaveCount(0);
});

test("a shared landlord plan displays only sales functions for a Sales Agent role", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "SalesAgent",
    permissions: ["create_property", "view_property", "create_unit", "view_sale_pipeline"],
  });
  await propertyOverview(page, ["PROPERTY_RENTALS", "ESTATE_MANAGEMENT", "PROPERTY_SALES"]);

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Properties", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sale Units", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rentals", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Property Sale Management", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buyers", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Estate Management", exact: true })).toHaveCount(0);
});
