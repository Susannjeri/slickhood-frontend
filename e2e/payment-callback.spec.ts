import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

test("Flutterwave browser return never claims success when backend verification rejects it", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  let verificationUrl = "";
  await page.route("**/payment/fw/update**", async route => {
    verificationUrl = route.request().url();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ success: false, description: "Amount or destination verification failed." }),
    });
  });

  await page.goto("/callback/fw/payments?status=successful&tx_ref=INV-SECURE-9&transaction_id=7788");
  await expect(page.getByRole("heading", { name: "Payment Failed" })).toBeVisible();
  await expect(page.getByText("Amount or destination verification failed.")).toBeVisible();
  expect(verificationUrl).toContain("tx_ref=INV-SECURE-9");
  expect(verificationUrl).toContain("transaction_id=7788");
});

test("Paystack return is labelled submitted, not paid, until server verification completes", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  await page.goto("/payment/callback?reference=PSTACK-TEST-91");
  await expect(page.getByRole("heading", { name: "Payment submitted" })).toBeVisible();
  await expect(page.getByText("PSTACK-TEST-91")).toBeVisible();
  await expect(page.getByText(/confirming it securely before updating the invoice/i)).toBeVisible();
  await expect(page.getByText(/Payment Confirmed/i)).toHaveCount(0);
});
