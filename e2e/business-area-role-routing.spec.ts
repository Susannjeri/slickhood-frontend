import { expect, test } from "@playwright/test";
import { authenticated, testToken } from "./support";

test("landlord cannot open estate-management operator workspace", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_estate", "view_property", "view_lease"],
  });

  await page.goto("/dashboard/estate");

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
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

test("estate manager sees shared physical properties and selects only estate units afterwards", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_estate", "manage_estate"],
  });
  await page.route("**/estate/ownership**", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/property/list**", route => route.fulfill({ json: { success: true, data: [
    { id: 41, name: "Green Court", managementMode: "SERVICE_CHARGE" },
    { id: 42, name: "Rental Court", managementMode: "RENTAL" },
  ] } }));
  await page.route("**/property/unit/list**", route => route.fulfill({ json: { success: true, data: [] } }));

  await page.goto("/dashboard/estate");

  await expect(page.locator("main").getByRole("heading", { name: "Estate Management", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Estate" }).click();
  await expect(page.getByRole("option", { name: "Green Court" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Rental Court" })).toBeVisible();
});

test("estate selector searches and paginates beyond the first 25 server records", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "EstateManager",
    permissions: ["view_estate", "manage_estate"],
  });
  await page.route("**/estate/ownership**", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/property/unit/list**", route => route.fulfill({ json: { success: true, data: [], totalPages: 0 } }));
  const propertyRequests: URL[] = [];
  await page.route("**/property/list**", route => {
    const url = new URL(route.request().url());
    propertyRequests.push(url);
    const search = url.searchParams.get("search") ?? "";
    const pageNumber = Number(url.searchParams.get("page") ?? 0);
    const data = search
      ? [{ id: 103, name: "Searched Estate", managementMode: "SERVICE_CHARGE" }]
      : pageNumber === 0
        ? [{ id: 101, name: "First Estate", managementMode: "SERVICE_CHARGE" }]
        : [{ id: 102, name: "Estate Twenty Six", managementMode: "SERVICE_CHARGE" }];
    return route.fulfill({ json: { success: true, data, totalPages: search ? 1 : 2, totalElements: search ? 1 : 26 } });
  });

  await page.goto("/dashboard/estate");
  await expect(page.getByRole("button", { name: "Load more estates" })).toBeVisible();
  await page.getByRole("button", { name: "Load more estates" }).click();
  await page.getByRole("combobox", { name: "Estate" }).click();
  await expect(page.getByRole("option", { name: "Estate Twenty Six" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByPlaceholder("Search estates…").fill("Searched");
  await page.getByRole("combobox", { name: "Estate" }).click();
  await expect(page.getByRole("option", { name: "Searched Estate" })).toBeVisible();
  expect(propertyRequests.some(url => url.searchParams.get("page") === "1")).toBeTruthy();
  expect(propertyRequests.some(url => url.searchParams.get("search") === "Searched")).toBeTruthy();
  expect(propertyRequests.every(url => !url.searchParams.has("managementMode"))).toBeTruthy();
});

test("one owner identity can choose rental, homeowner, or sale units for one shared property", async ({ context, page }) => {
  const roles = [
    { title: "Landlord", permissions: ["create_property", "view_property", "create_unit"] },
    { title: "EstateManager", permissions: ["create_property", "view_property", "create_unit", "manage_estate"] },
    { title: "SalesAgent", permissions: ["create_property", "view_property", "create_unit", "manage_sale_pipeline"] },
  ];
  const token = testToken(roles);
  await context.addCookies([{ name: "token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.addInitScript(({ ownerRoles, accessToken }) => {
    localStorage.setItem("auth-storage", JSON.stringify({ state: {
      token: accessToken, sessionReady: true, step: "complete", roles: ownerRoles,
      roleName: ownerRoles.map(role => role.title), permissions: ownerRoles[0].permissions,
      propertyIds: [], propertyNames: [], activeRole: ownerRoles[0], selectedBusinessAreaId: "property-management",
    }, version: 0 }));
  }, { ownerRoles: roles, accessToken: token });
  await page.route("**/kyc/current", route => route.fulfill({ json: { success: true, data: [{ status: "APPROVED", accountStatus: "ACTIVE", phoneVerified: true, requirements: [], missingRequirements: [], documents: [] }] } }));

  await page.goto("/dashboard/property/create");

  await expect(page.getByRole("button", { name: /Rental property/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Homeowner estate/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Property for sale/i })).toBeVisible();
});

test("same-role staff explicitly select a workspace and subsequent requests carry its boundary", async ({ context, page }) => {
  const role = { title: "EstateManager", permissions: ["view_estate", "manage_estate"] };
  const token = await authenticated(context, page, role);
  await page.route("**/browser-session/get-token", route => route.fulfill({ json: { data: { jwt: token } } }));
  const workspaceHeaders: Array<string | undefined> = [];
  await page.route("**/team-access/workspaces", route => {
    workspaceHeaders.push(route.request().headers()["x-slickhood-workspace"]);
    return route.fulfill({ json: { success: true, data: [
      { id: 31, name: "North Estate", businessArea: "ESTATE_MANAGEMENT", owner: false },
      { id: 32, name: "South Estate", businessArea: "ESTATE_MANAGEMENT", owner: false },
    ] } });
  });

  await page.goto("/dashboard/privacy");
  await page.getByLabel("Workspace").selectOption("32");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.activeWorkspaceId === 32);
  await expect.poll(() => workspaceHeaders.includes("32")).toBeTruthy();
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state);
  expect(persisted.activeWorkspaceId).toBe(32);
});

test("switching a primary business role selects its product and opens its own workspace", async ({ context, page }) => {
  const landlord = { title: "Landlord", permissions: ["view_property"] };
  const estateManager = { title: "EstateManager", permissions: ["view_estate", "manage_estate"] };
  const token = testToken([landlord, estateManager]);
  await context.addCookies([{ name: "token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.addInitScript(({ roles, token }) => {
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

