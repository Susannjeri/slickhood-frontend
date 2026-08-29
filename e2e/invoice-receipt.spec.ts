import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("a verified invoice payment exposes a downloadable receipt with the provider reference", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Tenant",
    permissions: ["view_invoice_list", "view_invoice_pdf", "view_payment_list"],
  });
  await page.route("**/payment/invoice/list**", route => route.fulfill({ json: {
    ...envelope([{
      id: 401,
      createdOn: "2026-08-28T09:00:00+03:00",
      propertyDetails: "Property: Test Heights - Unit: A-12",
      propertyId: 17,
      tenantName: "Test Tenant",
      ref: "INV-RENT-401",
      currency: "KES",
      amount: 25000,
      paid: true,
    }]),
    totalPages: 1,
    totalElements: 1,
    size: 10,
  } }));
  await page.route("**/payment/view/invoice**", route => route.fulfill({
    contentType: "application/pdf",
    body: "%PDF-1.4 test invoice",
  }));
  await page.route("**/payment/list**", route => route.fulfill({ json: {
    ...envelope([{
      id: 901,
      createdOn: "2026-08-28T09:30:00+03:00",
      amount: 25000,
      channel: "MPESA",
      category: "PAYMENT_PROCESSED",
      customerName: "Test Tenant",
      transId: "MPESA-VERIFIED-901",
      status: "1",
      description: "Payment verified",
      inProgress: false,
      success: true,
    }]),
    totalPages: 1,
    totalElements: 1,
    size: 10,
  } }));
  await page.route("**/payment/view/receipt**", route => route.fulfill({
    contentType: "application/pdf",
    headers: { "content-disposition": "attachment; filename=receipt_901.pdf" },
    body: "%PDF-1.4 verified receipt MPESA-VERIFIED-901",
  }));

  await page.goto("/dashboard/invoices");
  await expect(page.getByText("INV-RENT-401", { exact: true }).first()).toBeVisible();
  await expect(page.locator("span").filter({ hasText: /^PAID$/ })).toBeVisible();
  await page.getByText("INV-RENT-401", { exact: true }).first().click();
  await page.getByText("Payment Details", { exact: true }).click();
  await expect(page.getByText("MPESA-VERIFIED-901", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Receipt" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("receipt_901.pdf");
});
