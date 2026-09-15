import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const workspaceFixture = (businessArea = "ESTATE_MANAGEMENT") => ({
  id: 7, name: "Green Court workspace", businessArea, owner: true,
  canGrantEntireWorkspace: true, seatLimit: 5, seatsUsed: 0,
  roles: [{ id: 12, code: "VIEWER", name: "Viewer", permissionTemplate: "VIEWER" }],
  resources: [{ id: 41, name: "Green Court", description: "Nairobi" }],
  invitations: [], members: [],
});

test("property handoff keeps least-privilege scope and confirms revocation", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Estate Manager",
    permissions: ["view_estate", "manage_estate"],
    propertyIds: [41],
    propertyNames: ["Green Court"],
  });

  let revokeCalls = 0;
  let revoked = false;
  await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({ json: envelope([{
    id: 7,
    name: "Green Court Estate Management",
    businessArea: "ESTATE_MANAGEMENT",
    owner: true,
    canGrantEntireWorkspace: true,
    seatLimit: 5,
    seatsUsed: revoked ? 0 : 1,
    roles: [{ id: 12, code: "ESTATE_OPERATIONS_MANAGER", name: "Estate operations manager", description: "Estate operations and community administration", permissionTemplate: "ESTATE_OPERATIONS_MANAGER" }],
    resources: [
      { id: 41, name: "Green Court", description: "Nairobi" },
      { id: 42, name: "Blue Court", description: "Mombasa" },
    ],
    invitations: [],
    members: revoked ? [] : [{
      id: 91,
      userId: 101,
      email: "manager@example.com",
      name: "Estate Manager",
      role: "ESTATE_OPERATIONS_MANAGER",
      roleName: "Estate operations manager",
      scopeType: "SELECTED_RESOURCES",
      resourceIds: [41],
      status: "ACTIVE",
      acceptedAt: "2026-08-30T10:00:00",
      activatedAt: "2026-08-30T11:00:00",
    }],
  }]) }));
  await page.route("**/team-access/members/91", async route => {
    if (route.request().method() === "DELETE") {
      revokeCalls += 1;
      revoked = true;
      await route.fulfill({ json: envelope({ status: "REVOKED" }) });
      return;
    }
    await route.fallback();
  });

  await page.goto("/dashboard/team-access?propertyId=41");

  await expect(page.getByText("Selected estates and properties")).toBeVisible();
  await expect(page.getByText("Green Court", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeChecked();

  let editedScope: unknown;
  await page.route("**/team-access/members/91/scope", async route => {
    editedScope = route.request().postDataJSON();
    await route.fulfill({ json: envelope([{ status: "ACTIVE" }]) });
  });
  await page.getByRole("button", { name: "Edit responsibilities" }).click();
  await page.getByRole("button", { name: "Save responsibilities" }).click();
  await expect.poll(() => editedScope).toEqual({ scopeType: "SELECTED_RESOURCES", resourceIds: [41] });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revoke membership?" })).toBeVisible();
  expect(revokeCalls).toBe(0);

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect.poll(() => revokeCalls).toBe(1);
  await expect(page.getByText("No internal users yet.")).toBeVisible();
});

test("scoped workspace administrator cannot grant all responsibility areas", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Workspace Admin",
    permissions: [],
    propertyIds: [41],
    propertyNames: ["Green Court"],
  });

  await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({ json: envelope([{
    id: 7,
    name: "Green Court Estate Management",
    businessArea: "ESTATE_MANAGEMENT",
    owner: false,
    canGrantEntireWorkspace: false,
    seatLimit: 5,
    seatsUsed: 1,
    roles: [{ id: 13, code: "ESTATE_VIEWER", name: "Viewer", description: "Read-only workspace access", permissionTemplate: "VIEWER" }],
    resources: [{ id: 41, name: "Green Court", description: "Nairobi" }],
    invitations: [],
    members: [],
  }]) }));

  await page.goto("/dashboard/team-access");

  await expect(page.locator("section").getByRole("heading", { name: "Internal Team", exact: true })).toBeVisible();
  await expect(page.getByText("Selected estates and properties")).toBeVisible();
  await page.getByText("Selected estates and properties").click();
  await expect(page.getByRole("option", { name: "All estates and properties" })).toHaveCount(0);
  await expect(page.getByText("Read-only workspace access")).toBeVisible();
});

for (const profile of [
  { title: "Landlord", businessArea: "LANDLORD", permissions: ["view_property", "manage_property"] },
  { title: "Estate Manager", businessArea: "ESTATE_MANAGEMENT", permissions: ["view_estate", "manage_estate"] },
  { title: "Sales Agent", businessArea: "PROPERTY_SALE_MANAGEMENT", permissions: ["view_property", "manage_property"] },
]) {
  test(`${profile.title} sends an invitation with selected responsibility areas`, async ({ context, page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await authenticated(context, page, { ...profile, propertyIds: [41], propertyNames: ["Green Court"] });
    let payload: unknown;
    let invited = false;
    await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({
      json: envelope([{ ...workspaceFixture(profile.businessArea), invitations: invited ? [{
        id: 82, email: "staff@example.com", role: "VIEWER", roleName: "Viewer",
        scopeType: "SELECTED_RESOURCES", resourceIds: [41], status: "PENDING",
        expiresAt: "2026-12-01T12:00:00", resendCount: 0,
      }] : [] }]),
    }));
    await page.route("**/team-access/invitations", async route => {
      payload = route.request().postDataJSON();
      invited = true;
      await route.fulfill({ json: envelope([{ id: 82 }]) });
    });
    if (profile.businessArea === "PROPERTY_SALE_MANAGEMENT") await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/team-access?propertyId=41");
    await expect(page.locator("section").getByRole("heading", { name: "Internal Team", exact: true })).toBeVisible();
    await page.getByLabel("Work email").fill("staff@example.com");
    await page.getByRole("button", { name: "Send secure invitation" }).click();
    await expect.poll(() => payload).toEqual({ email: "staff@example.com", roleDefinitionId: 12, scopeType: "SELECTED_RESOURCES", resourceIds: [41] });
    await expect(page.getByText("staff@example.com", { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

for (const failure of [
  { name: "empty workspace list", status: 200, body: envelope([]) },
  { name: "malformed workspace", status: 200, body: envelope([{ ...workspaceFixture(), roles: null }]) },
  { name: "forbidden workspace", status: 403, body: { success: false, description: "You do not have permission to manage this team.", data: [] } },
  { name: "server error", status: 500, body: { success: false, data: [] } },
]) {
  test(`${failure.name} remains recoverable without a render crash`, async ({ context, page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await authenticated(context, page, { title: "Estate Manager", permissions: ["view_estate", "manage_estate"] });
    let recovered = false;
    await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({
      status: recovered ? 200 : failure.status,
      json: recovered ? envelope([workspaceFixture()]) : failure.body,
    }));
    await page.goto("/dashboard/team-access");
    await expect(page.getByRole("heading", { name: "Internal Team could not be loaded" })).toBeVisible();
    await expect(page.locator('p[role="alert"]')).toHaveText(failure.status === 403
      ? "You do not have permission to manage this team."
      : "We could not load your internal team. Please try again. If this continues, contact support.");
    recovered = true;
    await page.getByRole("button", { name: "Retry loading team" }).click();
    await expect(page.locator("section").getByRole("heading", { name: "Internal Team", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry loading team" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}
