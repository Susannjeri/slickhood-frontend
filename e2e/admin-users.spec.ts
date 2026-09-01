import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

test("admin user directory shows every assigned user type", async ({ context, page }) => {
  await context.setExtraHTTPHeaders({ "Cache-Control": "no-cache" });
  const token = await authenticated(context, page, {
    title: "Superadmin",
    permissions: ["list_users", "manage_internal_staff"],
  });
  await page.addInitScript(({ accessToken }) => {
    const persisted = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    persisted.state = { ...persisted.state, token: accessToken };
    localStorage.setItem("auth-storage", JSON.stringify(persisted));
  }, { accessToken: token });

  await page.route("**/user/list**", route => route.fulfill({ json: {
    success: true,
    code: "s00000",
    description: "Success",
    data: [
      {
        name: "Multi Role User",
        email: "multi-role@example.com",
        registrationDate: "2026-09-01T10:00:00+03:00",
        lastLogin: "1 minute ago",
        country: "Kenya",
        city: "Nairobi",
        source: "LOCAL",
        active: true,
        profileType: { id: "INDIVIDUAL", name: "Individual" },
        userTypes: ["EstateManager", "Landlord", "Tenant"],
      },
      {
        name: "Incomplete User",
        email: "incomplete@example.com",
        registrationDate: "2026-09-01T10:00:00+03:00",
        lastLogin: "never",
        country: null,
        city: null,
        source: "LOCAL",
        active: false,
        profileType: { id: "COMPANY", name: "Company" },
        userTypes: [],
      },
    ],
    totalPages: 1,
    totalElements: 2,
    size: 14,
  } }));

  await page.goto("/dashboard/users");

  await expect(page.getByRole("cell", { name: "User Type", exact: true })).toBeVisible();
  const multiRoleRow = page.getByRole("row").filter({ hasText: "multi-role@example.com" });
  await expect(multiRoleRow.getByText("Landlord", { exact: true })).toBeVisible();
  await expect(multiRoleRow.getByText("Estate Management", { exact: true })).toBeVisible();
  await expect(multiRoleRow.getByText("Tenant", { exact: true })).toBeVisible();
  await expect(multiRoleRow.getByText("Individual", { exact: true })).toBeVisible();

  const incompleteRow = page.getByRole("row").filter({ hasText: "incomplete@example.com" });
  await expect(incompleteRow.getByText("No role assigned", { exact: true })).toBeVisible();
  await expect(incompleteRow.getByText("Company", { exact: true })).toBeVisible();
});
