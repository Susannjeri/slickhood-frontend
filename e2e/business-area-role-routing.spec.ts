import { expect, test } from "@playwright/test";
import { authenticated, testToken } from "./support";

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

  await expect(page.getByText("Manage homeowner onboarding, ownership history, service charges and estate operations.", { exact: true })).toBeVisible();
});

test("switching a primary business role selects its product and opens its own workspace", async ({ context, page }) => {
  const landlord = { title: "Landlord", permissions: ["view_property"] };
  const estateManager = { title: "EstateManager", permissions: ["view_estate", "manage_estate"] };
  const token = testToken([landlord, estateManager]);
  await context.addCookies([{ name: "token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.addInitScript(({ roles, token }) => {
    if (localStorage.getItem("auth-storage")) return;
    localStorage.setItem("auth-storage", JSON.stringify({ state: {
      token, sessionReady: true, step: "complete", roles, roleName: roles.map(role => role.title),
      permissions: roles[0].permissions, propertyIds: [], propertyNames: [], activeRole: roles[0],
      selectedBusinessAreaId: "property-management",
    }, version: 0 }));
  }, { roles: [landlord, estateManager], token });
  await page.route("**/browser-session/get-token", route => route.fulfill({ json: { data: { jwt: token } } }));
  await page.route("**/kyc/current", route => route.fulfill({ json: { success: true, data: [{ status: "APPROVED", accountStatus: "ACTIVE", phoneVerified: true, requirements: [], missingRequirements: [], documents: [] }] } }));
  let estateRequestRole: string | undefined;
  await page.route("**/estate/ownership**", route => {
    estateRequestRole = route.request().headers()["x-slickhood-role"];
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: { success: true, data: [] } }));

  // Use a role-neutral dashboard page so unrelated dashboard data calls cannot
  // invalidate the deliberately synthetic multi-role browser session.
  await page.goto("/dashboard/privacy");
  await page.getByRole("button", { name: /Active Role.*Landlord/i }).click();
  await page.getByRole("button", { name: /Estate Management/ }).click();

  await expect(page).toHaveURL(/\/dashboard\/estate$/);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state);
  expect(persisted.activeRole.title).toBe("EstateManager");
  expect(persisted.selectedBusinessAreaId).toBe("estate-management");
  expect(estateRequestRole).toBe("EstateManager");
});

for (const participant of ["Tenant", "Buyer", "Homeowner"]) {
  test(`${participant} cannot open owner subscription controls`, async ({ context, page }) => {
    await authenticated(context, page, { title: participant, permissions: [] });
    await page.goto("/dashboard/subscriptions");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
}

