import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("the billed customer can pay an invoice from the billing summary using a server-authorized rail", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Tenant",
    permissions: ["view_invoice_list", "view_invoice_pdf", "view_payment_list"],
  });
  await page.route("**/payment/invoice/list**", route => route.fulfill({ json: {
    ...envelope([{
      id: 501,
      createdOn: "2026-09-03T08:00:00+03:00",
      propertyDetails: "Property: Test Heights - Unit: B-14",
      propertyId: 17,
      tenantName: "Test Tenant",
      ref: "INV-RENT-501",
      currency: "KES",
      amount: 6501,
      pendingAmount: 6501,
      paid: false,
      paymentAccountId: 91,
      dueDate: "2026-09-28",
      issuerName: "Test Heights Management",
      issuerType: "ESTATE_MANAGEMENT",
      payableByCurrentUser: true,
      recordableByCurrentUser: false,
    }]),
    totalPages: 1,
    totalElements: 1,
    size: 10,
  } }));
  await page.route("**/payment/view/invoice**", route => route.fulfill({
    contentType: "application/pdf",
    body: "%PDF-1.4 test invoice",
  }));
  await page.route("**/payment/invoice/payment-account**", route => route.fulfill({ json: envelope([{
    id: 91,
    name: "M-Pesa Paybill 123456",
    channel: "MPESA",
    channelDisplayName: "M-Pesa",
    active: true,
    verified: true,
  }]) }));
  let initialization: { method: string; body: Record<string, unknown> } | undefined;
  await page.route("**/payment/init", async route => {
    initialization = {
      method: route.request().method(),
      body: route.request().postDataJSON(),
    };
    await route.fulfill({ json: { ...envelope([]), code: "S0091", description: "Payment requested" } });
  });

  await page.goto("/dashboard/invoices");
  await expect(page.getByText("Balance due")).toBeVisible();
  await expect(page.getByText("KES 6,501.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Pay balance" }).click();
  await page.getByRole("button", { name: /M-Pesa Paybill 123456/ }).click();
  await page.getByRole("button", { name: "Confirm Payment" }).click();

  await expect.poll(() => initialization).toBeTruthy();
  expect(initialization).toEqual({
    method: "POST",
    body: { invoiceRef: "INV-RENT-501", accountId: 91, paymentChannel: "MPESA" },
  });
});
