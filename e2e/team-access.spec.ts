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
  await page.route("**/team-access", route => route.fulfill({ json: envelope({
    id: 7,
    name: "Green Court Estate Management",
    businessArea: "ESTATE_MANAGEMENT",
    owner: true,
    seatLimit: 5,
    seatsUsed: revoked ? 0 : 1,
    roles: [{ id: 12, code: "ESTATE_OPERATIONS_MANAGER", name: "Estate operations manager", permissionTemplate: "ESTATE_OPERATIONS_MANAGER" }],
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

  await expect(page.getByText("Selected properties, estates or listings")).toBeVisible();
  await expect(page.getByText("Green Court", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox").first()).toBeChecked();

  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revoke membership?" })).toBeVisible();
  expect(revokeCalls).toBe(0);

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect.poll(() => revokeCalls).toBe(1);
  await expect(page.getByText("No team members yet.")).toBeVisible();
});
