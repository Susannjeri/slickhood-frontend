import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const invoice = {
  id: 501, createdOn: "2026-09-07T08:00:00+03:00", propertyDetails: "Test business",
  propertyId: 17, tenantName: "Test payer", ref: "TEST-501", currency: "KES",
  amount: 25, pendingAmount: 25, paid: false, paymentAccountId: 91,
  issuerName: "Test business", payableByCurrentUser: true, recordableByCurrentUser: false,
};

for (const [title, path] of [
  ["EstateManager", "/dashboard/estate/accounts"],
  ["SalesAgent", "/dashboard/sales/accounts"],
  ["ServiceProvider", "/dashboard/merchant-accounts"],
  ["Superadmin", "/dashboard/slickhood-accounts"],
]) {
  test(`${title} billing navigation points to its own receiving settings`, async ({ context, page }, testInfo) => {
    await authenticated(context, page, { title, permissions: ["view_account", "view_invoice_list", "view_payment_list"] });
    await page.route("**/account/list**", route => route.fulfill({ json: envelope([]) }));
    await page.goto(path);
    await expect(page.getByRole("navigation", { name: "Billing", exact: true }).getByRole("link", { name: "Receiving accounts" })).toHaveAttribute("href", path);
    await expect(page.getByRole("heading", { name: "Set up where your business receives payments" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Account", exact: true })).toHaveCount(0);
    if (title === "EstateManager") await page.screenshot({ path: testInfo.outputPath("billing-settings.png"), fullPage: true });
  });
}

for (const channel of ["MPESA_BANK", "PESA_LINK"]) {
  test(`${channel} instructions stay visible without claiming payment success`, async ({ context, page }) => {
    await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list", "view_invoice_pdf", "view_payment_list"] });
    await page.route("**/payment/invoice/list**", route => route.fulfill({ json: { ...envelope([invoice]), totalPages: 1, totalElements: 1 } }));
    await page.route("**/payment/view/invoice**", route => route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4 test" }));
    await page.route("**/payment/invoice/payment-account**", route => route.fulfill({ json: envelope([{ id: 91, name: "Test receiving account", channel, active: true, verified: true }]) }));
    await page.route("**/payment/init", route => route.fulfill({ json: { ...envelope(["Test bank reference TEST-501"]), code: channel === "PESA_LINK" ? "S00268" : "S00280" } }));
    await page.goto("/dashboard/invoices");
    await expect(page.getByRole("navigation", { name: "Billing", exact: true }).getByRole("link", { name: "Receiving accounts" })).toHaveCount(0);
    await page.getByRole("button", { name: "Pay balance" }).click();
    await page.getByRole("button", { name: "Test receiving account" }).click();
    await page.getByRole("button", { name: "Confirm Payment" }).click();
    await expect(page.getByRole("heading", { name: "Payment instructions" })).toBeVisible();
    await expect(page.getByText("Test bank reference TEST-501")).toBeVisible();
    await expect(page.getByText(/invoice remains unpaid until the payment is verified/)).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByText("KES 25.00").first()).toBeVisible();
  });
}

test("checkout hides unverified receiving accounts", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_invoice_list", "view_invoice_pdf"] });
  await page.route("**/payment/invoice/list**", route => route.fulfill({ json: { ...envelope([invoice]), totalPages: 1, totalElements: 1 } }));
  await page.route("**/payment/view/invoice**", route => route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4 test" }));
  await page.route("**/payment/invoice/payment-account**", route => route.fulfill({ json: envelope([{ id: 91, name: "Unverified destination", channel: "MPESA", active: true, verified: false }]) }));
  await page.goto("/dashboard/invoices");
  await page.getByRole("button", { name: "Pay balance" }).click();
  await expect(page.getByText(/No verified receiving account is available/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Unverified destination" })).toHaveCount(0);
});

test("replacing a receiving credential clears readiness without exposing the secret", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_account", "edit_account", "create_account", "view_invoice_list", "view_payment_list"] });
  let verified = true;
  const account = () => ({ id: 91, name: "Test collections", category: "LANDLORD", channel: "MPESA", active: true, verified,
    properties: [{ key: "consumerSecret", label: "Consumer secret", description: "Protected test credential", value: "*****", encrypted: true, displayField: false }] });
  await page.route("**/account/list**", route => route.fulfill({ json: envelope([account()]) }));
  await page.route("**/account/91", route => route.fulfill({ json: envelope([account()]) }));
  let replacement: Record<string, unknown> | undefined;
  await page.route("**/account/91/property", route => {
    replacement = route.request().postDataJSON();
    verified = false;
    return route.fulfill({ json: envelope([]) });
  });
  const consoleMessages: string[] = [];
  page.on("console", message => consoleMessages.push(message.text()));
  await page.goto("/dashboard/accounts");
  await expect(page.getByRole("navigation", { name: "Billing", exact: true }).getByRole("link", { name: "Receiving accounts" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: /Test collections/ }).click();
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  const input = page.getByPlaceholder("Enter new value");
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("type", "password");
  await input.fill("synthetic-replacement-only");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => replacement).toBeTruthy();
  await expect(page.getByText("Payment detail updated — recheck the account before using it", { exact: true })).toBeVisible();
  await expect(page.getByText("Setup incomplete", { exact: true }).last()).toBeVisible();
  expect(consoleMessages.join("\n")).not.toContain("synthetic-replacement-only");
});
