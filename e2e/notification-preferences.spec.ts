import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const categories = (phoneVerified = true) => ["BILLING", "PROPERTY", "MARKETPLACE_DELIVERY", "SECURITY", "MARKETING"].map((category, index) => ({
  category,
  emailEnabled: category !== "MARKETING",
  smsEnabled: false,
  whatsappEnabled: false,
  smsAvailable: phoneVerified,
  whatsappAvailable: phoneVerified && category === "PROPERTY",
  version: index,
}));

test("user explicitly consents and selects independent notification channels", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  let saved: Record<string, unknown> | undefined;
  await context.route("http://127.0.0.1:8989/notification/preferences", async route => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: envelope([{ inAppRequired: true, phoneVerified: true, maskedPhone: "********8650", whatsappConsented: true, consentVersion: "whatsapp-notifications-v1-2026-09", categories: categories(true).map(item => item.category === "PROPERTY" ? { ...item, whatsappEnabled: true, version: item.version + 1 } : item) }]) });
    }
    return route.fulfill({ json: envelope([{ inAppRequired: true, phoneVerified: true, maskedPhone: "********8650", whatsappConsented: false, consentVersion: "whatsapp-notifications-v1-2026-09", categories: categories(true) }]) });
  });

  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Notification preferences" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "In app for Billing" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "In app for Billing" })).toBeDisabled();
  await expect(page.getByRole("switch", { name: "WhatsApp for Property" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Consent to WhatsApp notifications" }).check();
  await page.getByRole("switch", { name: "WhatsApp for Property" }).click();
  await page.getByRole("button", { name: "Save preferences" }).click();

  await expect.poll(() => saved).toBeTruthy();
  expect(saved?.whatsappConsent).toBe(true);
  expect((saved?.categories as { category: string; whatsappEnabled: boolean }[])
    .find(item => item.category === "PROPERTY")?.whatsappEnabled).toBe(true);
});

test("unverified users are directed to Profile and cannot enable phone channels", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  await context.route("http://127.0.0.1:8989/notification/preferences", route => route.fulfill({ json: envelope([{
    inAppRequired: true, phoneVerified: false, maskedPhone: "********8650", whatsappConsented: false,
    consentVersion: "whatsapp-notifications-v1-2026-09", categories: categories(false),
  }]) }));
  await page.goto("/dashboard/settings");
  await expect(page.getByText("Verify your phone first")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Profile" })).toHaveAttribute("href", "/dashboard/user");
  await expect(page.getByRole("switch", { name: "SMS for Billing" })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: "Consent to WhatsApp notifications" })).toBeDisabled();
});
