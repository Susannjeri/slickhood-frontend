import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_property", "create_unit", "view_unit_list", "view_account", "view_estate", "manage_estate"],
    propertyIds: [41],
    propertyNames: ["Green Court"],
  });
  await page.route("**/property/type**", route => route.fulfill({ json: envelope([
    { id: "APARTMENT", name: "Apartment", description: "Multi-unit residential property" },
  ]) }));
  await page.route("**/property/unit/type**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/list?**", route => route.fulfill({ json: envelope([{
    id: 41,
    name: "Green Court",
    type: "APARTMENT",
    managementMode: "SERVICE_CHARGE",
    address: "Nairobi",
    mapLocation: "-1.286389,36.817223",
    currency: "KES",
    image: "",
  }]) }));
  await page.route("**/property/unit/list?**", route => route.fulfill({ json: {
    ...envelope([]), totalPages: 0, totalElements: 0,
  } }));
  await page.route("**/invite/types", route => route.fulfill({ json: envelope([]) }));
});

test("new service-charge property starts a guided estate setup journey", async ({ page }) => {
  await page.route("**/estate/setup/properties/41", route => route.fulfill({ json: envelope({
    propertyId: 41,
    propertyName: "Green Court",
    managementMode: "SERVICE_CHARGE",
    activeUnits: 0,
    activeStaff: 0,
    operatingAccounts: 0,
    activeHomeowners: 0,
    currentBudgets: 0,
    unitsConfigured: false,
    billingConfigured: false,
    homeownerOperationsConfigured: false,
    readyForHomeownerOperations: false,
    nextAction: "ADD_UNITS",
  }) }));

  await page.goto("/dashboard/property/properties/details/41");

  await expect(page.getByText("Estate setup", { exact: true })).toBeVisible();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await expect(page.getByText("Next: Add units")).toBeVisible();
  await page.getByRole("button", { name: "Add units" }).click();
  await expect(page).toHaveURL(/\/dashboard\/unit\/create\/41\?/);
  await expect(page).toHaveURL(/currency=KES/);
});

test("completed estate foundation leads into homeowner operations", async ({ page }) => {
  await page.route("**/estate/setup/properties/41", route => route.fulfill({ json: envelope({
    propertyId: 41,
    propertyName: "Green Court",
    managementMode: "SERVICE_CHARGE",
    activeUnits: 24,
    activeStaff: 2,
    operatingAccounts: 1,
    activeHomeowners: 24,
    currentBudgets: 1,
    unitsConfigured: true,
    billingConfigured: true,
    homeownerOperationsConfigured: true,
    readyForHomeownerOperations: true,
    nextAction: "READY",
  }) }));

  await page.goto("/dashboard/property/properties/details/41");

  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Next: Open estate operations")).toBeVisible();
  await page.getByRole("button", { name: "Open estate operations" }).click();
  await expect(page).toHaveURL("/dashboard/estate?propertyId=41");
});

test("homeowner assignment keeps the estate property scope", async ({ page }) => {
  await page.route("**/estate/setup/properties/41", route => route.fulfill({ json: envelope({
    propertyId: 41,
    propertyName: "Green Court",
    managementMode: "SERVICE_CHARGE",
    activeUnits: 24,
    activeStaff: 0,
    operatingAccounts: 1,
    activeHomeowners: 0,
    currentBudgets: 0,
    unitsConfigured: true,
    billingConfigured: true,
    homeownerOperationsConfigured: false,
    readyForHomeownerOperations: false,
    nextAction: "ASSIGN_HOMEOWNERS",
  }) }));

  await page.goto("/dashboard/property/properties/details/41");
  const scopedUnitsRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/property/unit/list") && url.searchParams.get("propertyId") === "41";
  });
  await page.getByRole("button", { name: "Assign homeowners" }).click();

  await expect(page).toHaveURL("/dashboard/homeowners?propertyId=41");
  await scopedUnitsRequest;
});
