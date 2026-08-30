import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_unit", "view_invite_list", "create_invite"],
  });
  await page.route("**/property/type**", route => route.fulfill({ json: envelope([{ id: "APARTMENT", name: "Apartment" }]) }));
  await page.route("**/property/unit/type**", route => route.fulfill({ json: envelope([{ id: 1, name: "Apartment" }]) }));
  await page.route("**/property/measurement/units**", route => route.fulfill({ json: envelope([{ id: 1, name: "sqm" }]) }));
  await page.route("**/property/unit/list?propertyId=11&unitId=77", route => route.fulfill({
    json: envelope([{
      propertyId: 11,
      ref: "A-101",
      unitType: "1",
      propertyType: "APARTMENT",
      size: 85,
      measurementUnits: { id: 1, name: "sqm" },
      utilities: [],
      leaseMode: "SERVICE_CHARGE",
      price: 7500,
      currency: "KES",
      occupied: false,
      advertise: false,
      thumbnail: "",
      images: [],
      unitId: 77,
      templateId: null,
    }]),
  }));
  await page.route("**/property/unit/charges?unitId=77", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/invite/list**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/maintenance/unit/77", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/lease/documents**", route => route.fulfill({ json: envelope([]) }));
});

test("service-charge unit creates a homeowner invite rather than tenant access", async ({ page }) => {
  await page.goto("/dashboard/unit/details/77?p=11&from=homeowners");

  await expect(page.getByRole("button", { name: "Assign Homeowner" })).toBeVisible();
  await page.getByRole("button", { name: "Assign Homeowner" }).click();
  await expect(page.getByRole("heading", { name: "Create Homeowner Invite" })).toBeVisible();

  await page.route("**/invite/new", route => route.fulfill({
    status: 201,
    json: envelope(["https://slickhood.test/invite/homeowner"]),
  }));
  const requestPromise = page.waitForRequest(request => request.url().includes("/invite/new") && request.method() === "POST");
  await page.getByRole("button", { name: "Create Invite" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ inviteType: "HOMEOWNER", entityId: 77 });
  await expect(page.locator('input[value="https://slickhood.test/invite/homeowner"]')).toBeVisible();
});
