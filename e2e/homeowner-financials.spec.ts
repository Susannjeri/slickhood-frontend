import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Homeowner",
    permissions: ["view_estate", "view_service_charge", "view_invoice_list", "view_my_notifications"],
  });
});

test("homeowner sees ownership, reconciled balances, and overdue state", async ({ page }) => {
  await page.route("**/estate/ownership", route => route.fulfill({ json: envelope([{
    id: 9, propertyId: 11, unitId: 77, homeownerUserId: 200,
    ownershipStart: "2026-01-01", active: true,
  }]) }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: {
    ...envelope([{
      id: 5, propertyId: 11, propertyName: "Silverwood Estate", unitId: 77, unitRef: "A-101",
      homeownerUserId: 200, invoiceId: 44, invoiceRef: "INV-2C", amount: 7500, currency: "KES",
      dueDate: "2026-08-01", description: "August service charge", paid: false,
      pendingAmount: 2500, status: "OVERDUE", createdOn: "2026-07-20T08:00:00Z",
    }]), totalPages: 1, totalElements: 1, size: 50,
  } }));

  await page.goto("/dashboard/estate");

  await expect(page.getByRole("heading", { name: "My Home" })).toBeVisible();
  await expect(page.getByText("KES 2,500.00", { exact: true })).toBeVisible();
  await expect(page.getByText("OVERDUE", { exact: true })).toBeVisible();
  await expect(page.getByText(/Silverwood Estate \/ A-101/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add homeowner" })).toHaveCount(0);
});

test("private inbox calls only the recipient-scoped endpoint", async ({ page }) => {
  let globalReportCalled = false;
  await page.route("**/notification/list**", route => {
    globalReportCalled = true;
    return route.fulfill({ status: 500 });
  });
  await page.route("**/notification/mine**", route => route.fulfill({ json: {
    ...envelope([{
      id: 31, channel: "EMAIL", notificationType: "PAYMENT_REMINDER",
      message: "Your August service charge is overdue.", delivered: true,
      createdOn: "2026-08-15T09:30:00Z", lastUpdatedOn: "2026-08-15T09:31:00",
    }]), totalPages: 1, totalElements: 1, size: 10,
  } }));

  await page.goto("/dashboard/notifications");

  await expect(page.getByRole("heading", { name: "Your notifications" })).toBeVisible();
  await expect(page.getByText("Your August service charge is overdue.")).toBeVisible();
  expect(globalReportCalled).toBe(false);
});
