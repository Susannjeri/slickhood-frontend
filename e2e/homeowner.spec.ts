import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_unit", "view_invite_list", "create_invite", "share_invite", "create_similar_unit", "view_estate", "manage_estate", "view_service_charge"],
    propertyIds: [11],
  });
  await page.route("**/property/type**", route => route.fulfill({ json: envelope([{ id: "APARTMENT", name: "Apartment" }]) }));
  await page.route("**/property/unit/type**", route => route.fulfill({ json: envelope([{ id: 1, name: "Apartment" }]) }));
  await page.route("**/property/measurement/units**", route => route.fulfill({ json: envelope([{ id: 1, name: "sqm" }]) }));
  await page.route("**/property/unit/list?propertyId=11&unitId=77", route => route.fulfill({
    json: envelope({
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
    }),
  }));
  await page.route("**/property/unit/charges?unitId=77", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/invite/list**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/maintenance/unit/77", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/lease/documents**", route => route.fulfill({ json: envelope([]) }));
});

test("service-charge unit opens a prefilled two-field homeowner invitation", async ({ page }) => {
  await page.goto("/dashboard/unit/details/77?p=11&from=homeowners");

  await expect(page.getByRole("button", { name: "Assign Homeowner" }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tenant", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Lease", exact: true })).toHaveCount(0);
  await expect(page.getByText("No Active Lease", { exact: true })).toHaveCount(0);
  await page.route("**/property/list**", route => route.fulfill({ json: envelope([{ id: 11, name: "Silverwood Estate" }]) }));
  await page.route("**/property/unit/list**", route => route.fulfill({ json: envelope([{
    unitId: 77, propertyId: 11, ref: "A-101", unitType: "APARTMENT", size: 85,
    measurementUnits: { id: 1, name: "sqm" }, currency: "KES", price: 7500, leaseMode: "SERVICE_CHARGE",
  }]) }));
  await page.route("**/estate/ownership**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/operations/properties/11/**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/invite/email", route => route.fulfill({
    status: 200,
    json: envelope([]),
  }));
  await page.getByRole("button", { name: "Assign Homeowner" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/estate\?propertyId=11&unitId=77/);
  await expect(page.getByText("Selected homeowner unit")).toBeVisible();
  await expect(page.getByText("Silverwood Estate").last()).toBeVisible();
  await expect(page.getByText("A-101", { exact: true }).last()).toBeVisible();
  await expect(page.getByLabel("Homeowner unit")).toHaveCount(0);
  await page.getByLabel("Homeowner email").fill("owner@example.com");
  await page.getByLabel("Agreement effective date").fill("2026-09-01");
  const requestPromise = page.waitForRequest(request => request.url().includes("/invite/email") && request.method() === "POST");
  await page.getByRole("button", { name: "Send invitation & agreement" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({
    inviteType: "HOMEOWNER",
    entityId: 77,
    email: "owner@example.com",
    leaseStartDate: "2026-09-01",
  });
  await expect(page.getByText("Generated Invite Link")).toHaveCount(0);
});

test("similar unit generation submits the requested number of additional units", async ({ page }) => {
  await page.route("**/property/unit/create/similar/status**", route =>
    route.fulfill({ json: envelope({ jobId: 901, sourceUnitId: 77, count: 12, completed: true, description: "completed successfully" }) }));
  await page.route("**/property/unit/create/similar?**", route =>
    route.fulfill({ json: envelope({ jobId: 901, sourceUnitId: 77, count: 12, status: "QUEUED" }) }));
  await page.goto("/dashboard/unit/details/77?p=11&from=homeowners");
  await expect(page.getByRole("button", { name: "Create Similar Units" })).toBeVisible();
  await page.getByRole("button", { name: "Create Similar Units" }).click();
  await page.getByLabel("Number of additional units (1–49)").fill("12");
  const requestPromise = page.waitForRequest(request => request.url().includes("/property/unit/create/similar") && request.method() === "PATCH");
  await page.getByRole("button", { name: "Create 12 Units" }).click();
  const request = await requestPromise;
  expect(request.url()).toContain("unitId=77");
  expect(request.url()).toContain("count=12");
  await expect(page.getByText("12 similar units created successfully.")).toBeVisible();
});

test("homeowner can report maintenance but cannot advance operational status", async ({ page }) => {
  await page.goto("/dashboard/unit/details/77?p=11&from=homeowners");
  await page.getByRole("tab", { name: "Maintenance" }).click();
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByPlaceholder("Issue title").fill("Kitchen leak");
  await page.getByPlaceholder("Describe the problem and access considerations").fill("Water is collecting below the sink.");
  await page.route("**/maintenance", route => route.request().method() === "POST" ? route.fulfill({ json: envelope({id:1}) }) : route.continue());
  const requestPromise = page.waitForRequest(request => request.url().endsWith("/maintenance") && request.method() === "POST");
  await page.getByRole("button", { name: "Submit request" }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({unitId:77,title:"Kitchen leak",description:"Water is collecting below the sink."});
  await expect(page.getByText("Advance status")).toHaveCount(0);
});
