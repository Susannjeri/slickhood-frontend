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

test("Paystack return is labelled paid only after authenticated server verification", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  let confirmationUrl = "";
  await page.route("**/payment/paystack/confirm**", async route => {
    confirmationUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { invoiceRef: "INV-TEST-91", paid: true, paymentStatus: "successful" },
      }),
    });
  });

  await page.goto("/payment/callback?reference=91");
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page.getByText("91", { exact: true })).toBeVisible();
  await expect(page.getByText(/invoice and subscription have been updated/i)).toBeVisible();
  expect(confirmationUrl).toContain("reference=91");
});

test("Paystack return remains pending when authenticated server verification fails", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  await page.route("**/payment/paystack/confirm**", route => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({ success: false, description: "Provider verification is temporarily unavailable." }),
  }));

  await page.goto("/payment/callback?reference=92");
  await expect(page.getByRole("heading", { name: "Confirmation pending" })).toBeVisible();
  await expect(page.getByText(/confirmation has not completed yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry confirmation" })).toBeVisible();
  await expect(page.getByText(/Payment confirmed/i)).toHaveCount(0);
});
