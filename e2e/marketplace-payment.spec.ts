import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("customer sees payment only after provider acceptance and invoice creation", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_sp_service"] });
  await page.route("**/sp/directory**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/sp/category/list**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/sp/booking/my**", route => route.fulfill({ json: envelope([{
    id: 70,
    serviceId: 12,
    serviceName: "Emergency plumbing",
    serviceProviderName: "Verified Plumbing Ltd",
    bookedByUserName: "Test Tenant",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: "AWAITING_PAYMENT",
    invoiceRef: "INV-SVC-70",
    paymentAccountId: 9,
    paymentChannel: "MPESA",
    paymentStatus: "UNPAID",
    refundStatus: "NOT_REQUIRED",
  }]) }));

  await page.goto("/dashboard/marketplace");
  await page.getByRole("button", { name: "My bookings" }).click();
  await expect(page.getByText("INV-SVC-70", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay now" })).toBeVisible();
  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page.getByRole("dialog", { name: "Continue to payment" })).toBeVisible();
  await expect(page.getByLabel("Payment phone (optional)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start work" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Complete with evidence" })).toHaveCount(0);
});
