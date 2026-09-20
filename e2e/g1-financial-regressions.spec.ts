import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("payment history renders legacy channel and category values", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_payment_list"],
  });
  await page.route("**/payment/list**", route => route.fulfill({
    json: {
      ...envelope([{
        id: 71,
        amount: 12500,
        customerName: "Amina Wanjiku",
        customerAccount: "+254700000000",
        transId: "LEGACY-RECEIPT-71",
        channel: "Legacy bank import",
        category: "LEGACY_COLLECTION",
        createdOn: "2026-09-20T08:00:00Z",
        status: "success",
        description: "Imported payment",
        inProgress: false,
        success: true,
      }]),
      totalPages: 1,
      totalElements: 1,
    },
  }));

  await page.goto("/dashboard/payments");

  const row = page.getByRole("row").filter({ hasText: "LEGACY-RECEIPT-71" });
  await expect(row).toContainText("Legacy bank import");
  await expect(row).toContainText("LEGACY_COLLECTION");
  await expect(row).toContainText("Successful");
});

test("late-payment settings persist the complete rule returned by the server", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_payment_list"],
  });
  await page.route("**/billing/late-fee-policy/RENTAL", async route => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: envelope([{
        billingType: "RENTAL",
        percentageRate: 0,
        graceDays: 0,
        maximumFee: null,
        enabled: false,
        configured: false,
        effectiveFrom: null,
      }]) });
    }
    expect(route.request().postDataJSON()).toEqual({
      percentageRate: 5,
      graceDays: 7,
      maximumFee: 2500,
      enabled: true,
    });
    return route.fulfill({ json: envelope([{
      billingType: "RENTAL",
      percentageRate: 5,
      graceDays: 7,
      maximumFee: 2500,
      enabled: true,
      configured: true,
      effectiveFrom: "2026-09-20",
    }]) });
  });

  await page.goto("/dashboard/billing/late-payment");
  await page.getByLabel("Fee percentage").fill("5");
  await page.getByLabel("Grace days").fill("7");
  await page.getByLabel("Maximum fee (optional)").fill("2500");
  await page.getByRole("button", { name: "Turn on and save" }).click();

  await expect(page.getByText("Late fee is active.")).toBeVisible();
  await expect(page.getByText(/Late fee is active at 5% after 7 grace days/)).toBeVisible();
  await expect(page.getByText(/Current rule applies prospectively/)).toBeVisible();
});
