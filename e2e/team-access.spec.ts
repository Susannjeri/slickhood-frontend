import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("property handoff keeps least-privilege scope and confirms revocation", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Estate Manager",
    permissions: ["view_estate", "manage_estate"],
    propertyIds: [41],
    propertyNames: ["Green Court"],
  });

  let revokeCalls = 0;
  let revoked = false;
  await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({ json: envelope({
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
  }) }));
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

  await page.route("**/team-access", route => route.request().resourceType() === "document" ? route.continue() : route.fulfill({ json: envelope({
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
  }) }));

  await page.goto("/dashboard/team-access");

  await expect(page.getByRole("heading", { name: "Internal Team" })).toBeVisible();
  await expect(page.getByText("Selected estates and properties")).toBeVisible();
  await page.getByText("Selected estates and properties").click();
  await expect(page.getByRole("option", { name: "All estates and properties" })).toHaveCount(0);
  await expect(page.getByText("Read-only workspace access")).toBeVisible();
});
