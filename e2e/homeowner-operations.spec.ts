import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("homeowner visitor registration offers ownership-scoped units", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Homeowner",
    permissions: ["view_unit", "register_visitor", "view_visitor_list"],
  });
  await page.route("**/visitor/list**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/list/by/resident", route => route.fulfill({ json: envelope([{
    propertyName: "Silverwood Estate", propertyId: 11, unitId: 77, unitRef: "A-101",
  }]) }));

  await page.goto("/dashboard/visitors");
  await page.getByRole("button", { name: "Register Visitor" }).click();

  const unitSelect = page.locator("select").filter({ has: page.getByRole("option", { name: "A-101 — Silverwood Estate" }) });
  await expect(page.getByRole("option", { name: "A-101 — Silverwood Estate" })).toHaveCount(1);
  await unitSelect.selectOption("77");
  await expect(unitSelect).toHaveValue("77");
});

test("manager termination requires a reason and sends the structured request", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_estate", "manage_estate", "view_service_charge"],
    propertyIds: [11],
    propertyNames: ["Silverwood Estate"],
  });
  await page.route("**/estate/ownership**", route => route.request().method() === "GET"
    ? route.fulfill({ json: envelope([{ id: 9, propertyId: 11, propertyName: "Silverwood Estate", unitId: 77, unitRef: "A-101", homeownerUserId: 200, homeownerName: "Amina Owner", homeownerEmail: "amina@example.com", ownershipStart: "2026-01-01", active: true }]) })
    : route.continue());
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/operations/properties/11/**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/dashboard/estate");
  const scopedChargeRequest = page.waitForRequest(request => request.url().includes("/estate/service-charges")
    && new URL(request.url()).searchParams.get("propertyId") === "11");
  await page.getByLabel("Estate").click();
  await page.getByRole("option", { name: "Silverwood Estate" }).click();
  expect(new URL((await scopedChargeRequest).url()).searchParams.get("propertyId")).toBe("11");
  await page.getByRole("button", { name: "End ownership" }).click();
  await page.getByLabel("Reason").fill("Property sale completed");
  await page.route("**/estate/ownership/9/end", route => route.fulfill({ json: envelope({ id: 9, active: false }) }));
  const requestPromise = page.waitForRequest(request => request.url().endsWith("/estate/ownership/9/end") && request.method() === "POST");
  await page.getByRole("button", { name: "End ownership" }).last().click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({ reason: "Property sale completed" });
  expect(request.postDataJSON().endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("manager onboards a homeowner directly from the homeowner-unit list", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateOperationsManager",
    permissions: ["view_estate", "manage_estate", "view_service_charge"],
    propertyIds: [11],
    propertyNames: ["Silverwood Estate"],
  });
  await page.route("**/estate/ownership**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/list**", route => route.fulfill({ json: envelope([{
    unitId: 77, propertyId: 11, ref: "A-101", unitType: "APARTMENT", size: 120,
    measurementUnits: { id: 1, name: "sqm" }, currency: "KES", price: 7500, leaseMode: "SERVICE_CHARGE",
  }]) }));
  await page.route("**/estate/operations/properties/11/**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/dashboard/homeowners?propertyId=11");
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /Silverwood Estate \/ A-101/ }).click();
  await expect(page.getByText("Selected homeowner unit")).toBeVisible();
  await expect(page.getByText("120 sqm").first()).toBeVisible();
  await page.getByLabel("Homeowner email", { exact: true }).fill("resident@example.test");
  await page.route("**/invite/email", route => route.fulfill({ json: envelope([]) }));
  const sent = page.waitForRequest(request => request.url().endsWith("/invite/email") && request.method() === "POST");
  await page.getByRole("button", { name: "Send invitation & agreement", exact: true }).click();
  expect((await sent).postDataJSON()).toMatchObject({ inviteType: "HOMEOWNER", entityId: 77, email: "resident@example.test", leaseStartDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  await expect(page.getByText("Homeowner units", { exact: true })).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open home & invite" })).toHaveCount(0);
});
