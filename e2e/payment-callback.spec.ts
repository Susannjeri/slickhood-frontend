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
        data: [{ invoiceRef: "INV-TEST-91", paid: true, paymentStatus: "successful" }],
      }),
    });
  });

  await page.goto("/payment/callback?reference=91");
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page.getByText("91", { exact: true })).toBeVisible();
  await expect(page.getByText(/payment has been verified and applied/i)).toBeVisible();
  expect(confirmationUrl).toContain("reference=91");
});

test("Paystack return stops polling when provider verification is terminal", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  let confirmations = 0;
  await page.route("**/payment/paystack/confirm**", route => {
    confirmations += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [{ invoiceId: 44, invoiceRef: "INV-TEST-94", paid: false, paymentStatus: "verification_failed" }],
      }),
    });
  });

  await page.goto("/payment/callback?reference=94");
  await expect(page.getByText(/could not complete the secure confirmation/i)).toBeVisible({ timeout: 5_000 });
  expect(confirmations).toBe(1);
  await page.getByRole("button", { name: "Choose another payment method" }).click();
  await expect(page).toHaveURL(/\/dashboard\/invoices\?invoiceId=44&choosePayment=1/);
});

test("Paystack return remains pending when authenticated server verification fails", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  await page.route("**/payment/paystack/confirm**", route => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({ success: false, description: "Provider verification is temporarily unavailable." }),
  }));

  await page.goto("/payment/callback?reference=92");
  await expect(page.getByRole("heading", { name: "Confirmation pending" })).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/Paystack confirmation has not completed yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry confirmation" })).toBeVisible();
  await expect(page.getByText(/Payment confirmed/i)).toHaveCount(0);
});

test("Paystack return refreshes an expired access token before confirmation", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list"] });
  let tokenReads = 0;
  await page.route("**/browser-session/get-token", route => {
    tokenReads += 1;
    return tokenReads === 1
      ? route.fulfill({ status: 401, json: { success: false } })
      : route.fulfill({ status: 200, json: { data: { jwt: "refreshed-access-token" } } });
  });
  await page.route("**/browser-session/refresh", route => route.fulfill({ status: 200, json: { success: true } }));
  await page.route("**/payment/paystack/confirm**", route => {
    expect(route.request().headers().authorization).toBe("Bearer refreshed-access-token");
    return route.fulfill({ status: 200, json: { success: true, data: { paid: true, invoiceRef: "INV-93" } } });
  });

  await page.goto("/payment/callback?reference=93");
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  expect(tokenReads).toBeGreaterThanOrEqual(2);
});
