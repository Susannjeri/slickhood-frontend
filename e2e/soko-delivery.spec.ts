import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("customer reveals a delivery code in context without a browser alert", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  await page.route("**/soko/catalog**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/soko/order/my**", route => route.fulfill({ json: envelope([{
    order: { id: 41, orderNumber: "SOKO-00000041", storeId: 2, status: "DISPATCHED", paymentStatus: "PAID", invoiceRef: "INV-41", deliveryMethod: "DELIVERY", customerPhone: "0700000000", subtotal: 500, deliveryFee: 100, total: 600, currency: "KES", placedAt: new Date().toISOString(), deliveryCodeVerified: false, deliveryCodeAttempts: 0 },
    storeName: "Fresh Corner", items: [{ id: 1, productName: "Milk", quantity: 1 }],
  }]) }));
  await page.route("**/soko/order/41/delivery-code", route => route.fulfill({ json: envelope(["123456"]) }));

  await page.goto("/dashboard/soko");
  await page.getByRole("button", { name: "My orders" }).click();
  await page.getByRole("button", { name: "View delivery code" }).click();

  await expect(page.getByText("123456")).toBeVisible();
  await expect(page.getByText("Only share this after receiving and checking your order.")).toBeVisible();
});
