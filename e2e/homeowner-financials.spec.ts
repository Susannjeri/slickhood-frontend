import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Homeowner",
    permissions: ["view_estate", "view_service_charge", "view_invoice_list", "view_my_notifications"],
  });
});

test("homeowner sees ownership, reconciled balances, and overdue state", async ({ page }) => {
  await page.route("**/estate/ownership**", route => route.fulfill({ json: envelope([{
    id: 9, propertyId: 11, unitId: 77, homeownerUserId: 200,
    propertyName: "Silverwood Estate", unitRef: "A-101", homeownerName: "Amina Owner",
    homeownerEmail: "amina@example.com", ownershipStart: "2026-01-01", active: true,
  }]) }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: {
    ...envelope([{
      id: 5, propertyId: 11, propertyName: "Silverwood Estate", unitId: 77, unitRef: "A-101",
      homeownerUserId: 200, invoiceId: 44, invoiceRef: "INV-2C", amount: 7500, currency: "KES",
      dueDate: "2026-08-01", description: "August service charge", paid: false,
      pendingAmount: 2500, status: "OVERDUE", createdOn: "2026-07-20T08:00:00Z",
    }]), totalPages: 1, totalElements: 1, size: 50,
  } }));
  await page.route("**/estate/operations/properties/11/meetings**", route => route.fulfill({ json: {
    ...envelope([{id:3,propertyId:11,title:"Annual homeowners meeting",scheduledAt:"2026-09-15T15:00:00Z",venue:"Clubhouse",status:"SCHEDULED",quorumRequired:12,attendeeCount:0}]),totalPages:1,totalElements:1,size:20,
  } }));
  await page.route("**/estate/operations/properties/11/budgets**", route => route.fulfill({ json: {
    ...envelope([{budget:{id:4,propertyId:11,budgetYear:2026,name:"Estate operations",currency:"KES",status:"APPROVED"},lines:[{id:8,category:"Security",plannedAmount:500000,actualAmount:420000}],plannedTotal:500000,actualTotal:420000}]),totalPages:1,totalElements:1,size:20,
  } }));
  await page.route("**/estate/operations/properties/11/work-orders**", route => route.fulfill({ json: {
    ...envelope([{id:6,propertyId:11,workOrderNumber:"EWO-100",areaName:"Main gate",title:"Replace barrier motor",description:"Motor has intermittent faults",category:"SECURITY",priority:"HIGH",status:"IN_PROGRESS",currency:"KES"}]),totalPages:1,totalElements:1,size:20,
  } }));

  await page.goto("/dashboard/estate");

  await expect(page.getByRole("heading", { name: "My Home" })).toBeVisible();
  await expect(page.getByText("KES 2,500.00", { exact: true })).toBeVisible();
  await expect(page.getByText("OVERDUE", { exact: true })).toBeVisible();
  await expect(page.getByText(/Silverwood Estate \/ A-101/).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open home & invite" })).toHaveCount(0);
  await expect(page.getByText("Annual homeowners meeting")).toBeVisible();
  await page.getByRole("tab", { name: "Budgets" }).click();
  await expect(page.getByText(/Planned KES 500,000/)).toBeVisible();
  await page.getByRole("tab", { name: "Common work" }).click();
  await expect(page.getByText("Replace barrier motor")).toBeVisible();
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
