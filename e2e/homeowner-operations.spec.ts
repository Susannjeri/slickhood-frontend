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
  });
  await page.route("**/estate/ownership", route => route.request().method() === "GET"
    ? route.fulfill({ json: envelope([{ id: 9, propertyId: 11, unitId: 77, homeownerUserId: 200, ownershipStart: "2026-01-01", active: true }]) })
    : route.continue());
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/operations/properties/11/**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/dashboard/estate");
  await page.getByRole("button", { name: "End ownership" }).click();
  await page.getByLabel("Reason").fill("Property sale completed");
  await page.route("**/estate/ownership/9/end", route => route.fulfill({ json: envelope({ id: 9, active: false }) }));
  const requestPromise = page.waitForRequest(request => request.url().endsWith("/estate/ownership/9/end") && request.method() === "POST");
  await page.getByRole("button", { name: "End ownership" }).last().click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({ reason: "Property sale completed" });
  expect(request.postDataJSON().endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
