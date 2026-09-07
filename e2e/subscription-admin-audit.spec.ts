import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const free = { uuid: "soko", code: "SOKO_FREE", displayName: "Soko", planCategory: "SERVICE_PROVIDER", roleFamily: "SERVICE_PROVIDER", billingCycle: "MONTHLY", price: 0, currency: "KES", active: true, productKey: "SOKO", purchaseMode: "FREE", features: [{ featureKey: "SOKO_MARKETPLACE", enabled: true }], quotas: [], tierRank: 0 };
const custom = { ...free, uuid: "custom", code: "LANDLORD_PLATINUM_CUSTOM", displayName: "Platinum", planCategory: "LANDLORD", roleFamily: "LANDLORD", productKey: "LANDLORD", purchaseMode: "SALES_MANAGED", quotas: [{ metricKey: "UNITS", limitValue: -1 }] };

test("admin defaults to active offers, labels custom pricing and can inspect retired plans", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_subscription_plan", "edit_subscription_plan", "create_subscription_plan"] });
  const queries: URL[] = [];
  await page.route("**/plans?**", route => {
    const url = new URL(route.request().url()); queries.push(url);
    return route.fulfill({ json: { ...envelope(url.searchParams.has("active") ? [free, custom] : [free, custom, { ...free, uuid: "old", code: "STANDARD", active: false }]), totalPages: 1, totalElements: url.searchParams.has("active") ? 2 : 3 } });
  });
  await page.goto("/dashboard/subscriptions");
  await expect(page.getByText("Custom quote", { exact: true })).toBeVisible();
  await expect(page.getByText("Unlimited", { exact: true })).toBeVisible();
  expect(queries.at(-1)?.searchParams.get("active")).toBe("true");
  await page.getByLabel("Include retired plans").check();
  await expect(page.getByText("STANDARD", { exact: true })).toBeVisible();
  const oldRow = page.getByRole("row").filter({ hasText: "STANDARD" });
  await expect(oldRow.getByRole("button", { name: "Activate", exact: true })).toHaveCount(0);
  await page.getByLabel("Search plans").fill("SOKO_FREE");
  await expect.poll(() => queries.at(-1)?.searchParams.get("search")).toBe("SOKO_FREE");
});

test("admin can save free plan and unlimited quota without changing product identity", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_subscription_plan", "edit_subscription_plan"] });
  await page.route("**/plans?**", route => route.fulfill({ json: { ...envelope([custom]), totalPages: 1, totalElements: 1 } }));
  let payload: Record<string, unknown> | undefined;
  await page.route("**/plans/LANDLORD_PLATINUM_CUSTOM", route => { payload = route.request().postDataJSON(); return route.fulfill({ json: envelope(custom) }); });
  await page.goto("/dashboard/subscriptions");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator('input[value="LANDLORD_PLATINUM_CUSTOM"]')).toBeDisabled();
  await expect(page.locator('input[type="number"][value="-1"]')).toBeVisible();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByText("Subscription plan updated successfully.", { exact: true })).toBeVisible();
  expect(payload).toMatchObject({ price: 0, quotas: [{ metricKey: "UNITS", limitValue: -1 }], roleFamily: "LANDLORD" });
});

test("failed plan save retains edits and shows an actionable error", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_subscription_plan", "edit_subscription_plan"] });
  await page.route("**/plans?**", route => route.fulfill({ json: { ...envelope([free]), totalPages: 1, totalElements: 1 } }));
  let payload: Record<string, unknown> | undefined;
  await page.route("**/plans/SOKO_FREE", route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 400, json: { success: false, description: "Plan update rejected" } });
  });
  await page.goto("/dashboard/subscriptions");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Plan update rejected" })).toBeVisible();
  await expect(page.locator('input[value="SOKO_FREE"]')).toBeVisible();
  expect(payload).toMatchObject({ price: 0, quotas: [] });
});

test("gate controller maintenance surfaces failures instead of claiming success", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions: ["manage_gate_devices", "view_gate_events"], propertyIds: [4], propertyNames: ["Acacia"] });
  await page.route("**/smart-gate/devices?**", route => route.fulfill({ json: [{ deviceCode: "gate-4", propertyId: 4, displayName: "Main gate", enabled: true }] }));
  await page.route("**/smart-gate/events?**", route => route.fulfill({ json: { content: [] } }));
  await page.route("**/smart-gate/devices/gate-4/status", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/dashboard/smart-gates");
  await page.getByRole("button", { name: "Disable", exact: true }).click();
  await expect(page.getByText("Controller status could not be changed. Please retry.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Disable", exact: true })).toBeVisible();
});
