import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("admin delivery records distinguish SMTP acceptance from unconfirmed delivery", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_notifications"] });
  const common = { currency: "KES", description: null, createdOn: "2026-09-07T08:00:00+03:00", retry: true, status: null, recipient: "recipient@example.test", network: null, cost: 0, notificationType: "RENT_PAYMENT_REMINDER_EMAIL", retryCount: 0, callbackIP: null, lastUpdateOn: "2026-09-07T08:00:00+03:00" };
  await page.route("**/notification/list**", route => route.fulfill({ json: { ...envelope([
    { ...common, notificationId: 1, channel: "EMAIL", delivered: true },
    { ...common, notificationId: 2, channel: "SMS", delivered: false },
  ]), totalPages: 1, totalElements: 2 } }));
  await page.goto("/dashboard/notifications");
  await expect(page.getByText("Accepted by mail server", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery not confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("Failed", { exact: true })).toHaveCount(0);
});

test("personal notifications distinguish email acceptance and render email markup as safe text", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_my_notifications"] });
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([
    { id: 1, channel: "EMAIL", notificationType: "RENT_PAYMENT_REMINDER_EMAIL", message: "<p>Outstanding balance &amp; invoice</p>&lt;img src=x onerror=alert(1)&gt;", delivered: true, read: false, createdOn: "2026-09-07T08:00:00+03:00" },
    { id: 2, channel: "SMS", notificationType: "PAYMENT_SUCCESS_SMS", message: "Payment received", delivered: false, read: true, createdOn: "2026-09-07T08:00:00+03:00" },
  ]), totalElements: 2, totalPages: 1 } }));
  await page.route("**/notification/mine/1/read", route => route.fulfill({ json: envelope({}) }));
  await page.goto("/dashboard/notifications");
  await expect(page.getByText("Accepted by mail server", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery not confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Outstanding balance & invoice/)).toBeVisible();
  await expect(page.locator("article img")).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
});

test("notification fetch errors do not masquerade as an empty inbox", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_my_notifications"] });
  let failing = true;
  await page.route("**/notification/mine?**", route => route.fulfill(failing
    ? { status: 503, json: { message: "Notification service unavailable" } }
    : { json: { ...envelope([]), totalElements: 0, totalPages: 0 } }));
  await page.goto("/dashboard/notifications");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("You are all caught up")).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("You are all caught up")).toBeVisible();
});
