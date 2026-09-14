import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

for (const role of ["Tenant", "Homeowner", "Buyer"]) {
  test(`${role} sees a direct My units navigation item`, async ({ context, page }) => {
    await authenticated(context, page, {
      title: role,
      permissions: ["view_unit"],
    });
    await page.route("**/dash/totals**", route => route.fulfill({ json: envelope([{}]) }));
    await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));

    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "My units", exact: true })).toHaveAttribute("href", "/dashboard/my-units");
  });
}

test("property sales staff sees a direct Buyers navigation item", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "SalesAgent",
    permissions: ["view_sale_pipeline"],
  });
  await page.route("**/dash/totals**", route => route.fulfill({ json: envelope([{}]) }));
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: "Buyers", exact: true })).toHaveAttribute("href", "/dashboard/sales#buyers");
});

test("Buyers section link activates itself and deactivates the sales overview", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "SalesAgent",
    permissions: ["view_sale_pipeline"],
  });
  await page.route("**/dash/totals**", route => route.fulfill({ json: envelope([{}]) }));
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/sales**", route => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() !== "document" && (url.pathname === "/sales" || url.pathname === "/api/sales")) {
      return route.fulfill({ json: envelope([]) });
    }
    return route.continue();
  });

  await page.goto("/dashboard");
  const buyers = page.getByRole("link", { name: "Buyers", exact: true });
  await buyers.click();

  await expect(page).toHaveURL(/\/dashboard\/sales#buyers$/);
  await expect(page.getByText("Buyers & sale transactions", { exact: true })).toBeVisible();
  await expect(buyers).toHaveAttribute("data-active", "true");
  await expect(page.getByRole("button", { name: "Property Sale Management", exact: true })).toHaveAttribute("data-active", "false");
});

test("landlord tenant directory shows scoped contact, unit, documents and billing actions", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_active_lease", "edit_unit"],
    propertyIds: [41],
    propertyNames: ["Jabali Towers"],
  });
  await page.route("**/lease/list**", route => route.fulfill({ json: {
    ...envelope([{
      id: 71,
      tenantName: "Jane Tenant",
      tenantUserId: 801,
      tenantEmail: "jane@example.com",
      tenantPhoneNumber: "+254700000001",
      propertyId: 41,
      propertyName: "Jabali Towers",
      unitId: 96,
      unitRef: "JB-4A",
      agreementStatus: "SIGNED",
      lifecycleStatus: "ACTIVE",
      signed: true,
      currency: "KES",
      price: 35000,
      moveInDate: "2026-09-01",
    }]),
    totalPages: 1,
    totalElements: 1,
    number: 0,
    size: 25,
  } }));

  await page.goto("/dashboard/rental/tenants");

  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  await expect(page.getByText("Jane Tenant")).toBeVisible();
  await expect(page.getByText(/Jabali Towers \/ JB-4A/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View unit" })).toHaveAttribute("href", /unit\/details\/96/);
  await expect(page.getByRole("link", { name: "Lease documents" })).toHaveAttribute("href", /leaseId=71/);
  await expect(page.getByRole("link", { name: "Billing" })).toHaveAttribute("href", /tenantId=801/);
});

test("superadmin can review a subscriber and change only the renewal preference", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Superadmin",
    permissions: ["view_subscription_plan"],
  });
  let renewalPayload: unknown;
  await page.route("**/subscription/admin/subscribers**", route => route.fulfill({ json: {
      ...envelope([{
        subscriptionId: 18,
        userId: 501,
        fullName: "Susan Subscriber",
        email: "subscriber@example.com",
        phoneNumber: "+254700000002",
        accountStatus: "ACTIVE",
        role: "Landlord",
        product: "LANDLORD",
        planCode: "GOLD",
        status: "ACTIVE",
        startAt: "2026-09-01T00:00:00Z",
        endAt: "2026-10-01T00:00:00Z",
        autoRenew: false,
        createdOn: "2026-09-01T00:00:00Z",
      }]),
      totalPages: 1,
      totalElements: 1,
      number: 0,
      size: 25,
    } }));
  await page.route("**/subscription/admin/subscribers/18", route => {
    renewalPayload = route.request().postDataJSON();
    return route.fulfill({ json: envelope({ subscriptionId: 18, autoRenew: true }) });
  });

  await page.goto("/dashboard/subscribers");
  await expect(page.getByRole("link", { name: "Subscribers", exact: true })).toHaveAttribute("href", "/dashboard/subscribers");
  await expect(page.getByText("Susan Subscriber")).toBeVisible();
  await page.getByRole("button", { name: "View / edit" }).click();
  await expect(page.getByText("Contact and term details are read-only here.")).toBeVisible();
  await page.getByRole("switch", { name: "Automatic renewal" }).click();
  await page.getByRole("button", { name: "Save change" }).click();
  await expect.poll(() => renewalPayload).toEqual({ autoRenew: true });
});
