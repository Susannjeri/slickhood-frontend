import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("the billed customer can deep-link to and pay an exact participant-scoped invoice", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Tenant",
    permissions: ["view_invoice_list", "view_invoice_pdf", "view_payment_list"],
  });
  let invoiceListUrl = "";
  await page.route("**/payment/invoice/list**", route => { invoiceListUrl = route.request().url(); return route.fulfill({ json: {
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
  } }); });
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

  await page.goto("/dashboard/invoices?invoiceId=501");
  await expect.poll(() => invoiceListUrl).not.toBe("");
  expect(new URL(invoiceListUrl).searchParams.get("invoiceId")).toBe("501");
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

test("paid subscription checkout posts its invoice and M-Pesa number to the payment contract", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  const plan = {
    uuid: "landlord-silver-monthly",
    code: "LANDLORD_SILVER_MONTHLY",
    displayName: "Silver",
    planCategory: "RENTAL",
    roleFamily: "LANDLORD",
    productKey: "LANDLORD",
    billingCycle: "MONTHLY",
    purchaseMode: "SELF_SERVICE",
    tierRank: 2,
    price: 3500,
    currency: "KES",
    active: true,
    features: [],
    quotas: [],
  };
  await page.route("**/subscription/plans**", route => route.fulfill({ json: envelope([plan]) }));
  await page.route("**/subscription/current**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/subscription/payment-accounts**", route => route.fulfill({ json: envelope([{
    id: 71,
    name: "SlickHood sandbox",
    category: "SLICKHOOD",
    channel: "MPESA",
    channelDisplayName: "M-Pesa",
    active: true,
    verified: true,
  }]) }));
  let subscriptionRequest: Record<string, unknown> | undefined;
  await page.route("**/subscription/subscribe", route => {
    subscriptionRequest = route.request().postDataJSON();
    return route.fulfill({ json: envelope([{
      invoiceRef: "SUB-TEST-501",
      amount: 3500,
      currency: "KES",
      planCode: plan.code,
      role: "LANDLORD",
    }]) });
  });
  let paymentRequest: { method: string; body: Record<string, unknown> } | undefined;
  await page.route("**/payment/init", route => {
    paymentRequest = { method: route.request().method(), body: route.request().postDataJSON() };
    return route.fulfill({ json: { ...envelope([]), code: "S0091", description: "Payment requested" } });
  });

  await page.goto("/dashboard/upgrade-plan");
  await page.getByRole("button", { name: "Change Plan" }).click();
  await page.getByRole("button", { name: /M-Pesa.*SlickHood sandbox/ }).click();
  await page.getByLabel("M-Pesa phone number").fill("+254708374149");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect.poll(() => subscriptionRequest).toEqual({
    role: "LANDLORD",
    planCode: plan.code,
    paymentAccountId: 71,
  });
  await expect.poll(() => paymentRequest).toEqual({
    method: "POST",
    body: {
      invoiceRef: "SUB-TEST-501",
      accountId: 71,
      paymentChannel: "MPESA",
      phoneNumber: "+254708374149",
    },
  });
  await expect(page.getByRole("heading", { name: "Waiting for Payment Confirmation" })).toBeVisible();
});
