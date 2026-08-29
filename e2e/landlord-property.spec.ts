import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["create_property", "view_property", "create_unit", "view_account", "view_invoice_list"],
  });
  await page.route("**/property/type**", route => route.fulfill({
    json: envelope([{ id: "APARTMENT", name: "Apartment", description: "Multi-unit residential property" }]),
  }));
});

test("property creation remains usable when Google Maps is not configured", async ({ page }) => {
  const mapRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("maps.googleapis.com/maps/api/js")) mapRequests.push(request.url());
  });

  await page.goto("/dashboard/property/create");

  await expect(page.getByRole("heading", { name: "Create New Property" })).toBeVisible();
  await expect(page.getByText(/Map search is temporarily unavailable/i)).toBeVisible();
  const coordinates = page.getByLabel("Coordinates (Latitude, Longitude)");
  await expect(coordinates).toBeEditable();
  await coordinates.fill("-1.286389, 36.817223");
  await expect(coordinates).toHaveValue("-1.286389, 36.817223");
  expect(mapRequests).toHaveLength(0);
});

test("landlord navigation is grouped in task order", async ({ page }) => {
  await page.goto("/dashboard/property/create");

  const labels = page.locator('[data-sidebar="group-label"]');
  await expect(labels).toContainText(["Overview", "Property & Leasing", "Money", "Support"]);
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Properties", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();
});
