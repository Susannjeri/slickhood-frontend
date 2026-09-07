import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { authenticated, envelope } from "./support";

test("admin dashboard keeps metrics and sidebar functions without a duplicate directory", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["list_users", "view_config", "edit_config", "view_subscription_plan", "view_payments", "view_invoice_list", "view_account", "manage_sp_categories", "view_audit_logs", "view_gate_events", "view_notifications", "review_insurance_applications", "view_community_funds", "view_estate", "view_sale_pipeline", "view_visitor_list", "update_visitor_status", "view_lease_document", "view_all_params", "manage_property_listings"] });
  let requestedRole: string | null = null;
  await page.route("**/dash/totals**", route => { requestedRole = new URL(route.request().url()).searchParams.get("role"); return route.fulfill({ json: envelope({ inActiveUserPercent: 20, userLoggedInWithinCurrentMonth: 12, totalActiveProperties: 42, totalSubscriptionPaidWithinCurrentMonth: 1500 }) }); });
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));
  await page.goto("/dashboard");
  await expect(page.getByText("42", { exact: true })).toBeVisible();
  expect(requestedRole).toBe("SUPER_ADMIN");
  await expect(page.locator("#admin-functions")).toHaveCount(0);
  await expect(page.getByLabel("Find an admin function")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin Panel", exact: true })).toHaveCount(0);
  await expect(page.getByText("Operational pulse", { exact: true })).toBeVisible();
  for (const [name, href] of [
    ["Users & Staff", "/dashboard/users"],
    ["Subscriptions", "/dashboard/subscriptions"],
    ["Insurance Operations", "/dashboard/insurance/operations"],
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    expect(existsSync(path.join(process.cwd(), "src/app/(dashboard)", href, "page.tsx")), href).toBe(true);
  }
  await expect(page.getByText("Upcoming lease actions", { exact: true })).toHaveCount(0);
});

test("ordinary roles cannot see the admin directory or request global configuration", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  await page.route("**/dash/totals**", route => route.fulfill({ json: envelope([{ totalOccupiedUnits: 1 }]) }));
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));
  let configRequests = 0;
  await page.route("**/config/**", route => { configRequests++; return route.fulfill({ status: 403 }); });
  await page.goto("/dashboard");
  await expect(page.locator("#admin-functions")).toHaveCount(0);
  await page.goto("/dashboard/configs");
  // The navigation-derived proxy guard rejects this route before its client page mounts.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Configuration Settings", exact: true })).toHaveCount(0);
  expect(configRequests).toBe(0);
});

test("configuration read-only access displays zero and never shows edit or secret reveal", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_config"] });
  await page.route("**/config/names", route => route.fulfill({ json: envelope(["SMS_MAX_RETRIES"]) }));
  await page.route("**/config/value?**", route => route.fulfill({ json: envelope([{ name: "SMS_MAX_RETRIES", stringValue: null, intValue: 0, encrypted: false }]) }));
  await page.goto("/dashboard/configs");
  await page.getByRole("button", { name: "Load value", exact: true }).click();
  await expect(page.getByText("0", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
});

test("configuration rejects failed save honestly, retains the draft and never decrypts or caches secrets", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_config", "edit_config"] });
  await page.addInitScript(() => localStorage.setItem("config_cache_v1", JSON.stringify({ old: "old-account-config" })));
  await page.route("**/config/names", route => route.fulfill({ json: envelope(["AFRICAS_TALKING_SMS_PASSWORD", "GLOBAL_MPESA_CONSUMER_SECRET"]) }));
  await page.route("**/config/value?**", route => route.fulfill({ json: envelope([{ name: "SMS_PASSWORD", stringValue: "*****", intValue: 0, encrypted: true }]) }));
  let decryptCalls = 0;
  await page.route("**/config/value/decrypt**", route => { decryptCalls++; return route.fulfill({ status: 403 }); });
  let saves = 0;
  await page.route("**/config/update", route => { saves++; return route.fulfill({ json: { success: false, description: "Rejected" } }); });
  await page.goto("/dashboard/configs");
  await page.getByRole("button", { name: "Load value", exact: true }).click();
  await page.getByRole("button", { name: "Replace secret", exact: true }).click();
  const input = page.getByLabel(/Replacement value for/);
  await expect(input).toHaveValue(""); await expect(input).toHaveAttribute("type", "password");
  await input.fill("synthetic-regression-secret");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Configuration was not saved. Check the value and retry.")).toBeVisible();
  await expect(input).toHaveValue("synthetic-regression-secret");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  expect(saves).toBe(1); expect(decryptCalls).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("config_cache_v1"))).toBeNull();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("synthetic-regression-secret");
  await expect(page.getByText("Global Mpesa Consumer Secret", { exact: true })).toHaveCount(0);
});

test("dashboard failure exposes retry without fabricating zero totals", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: [] });
  let calls = 0;
  await page.route("**/dash/totals**", route => { calls++; return calls === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: envelope([{ totalActiveProperties: 17, inActiveUserPercent: 20 }]) }); });
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([]) }));
  await page.goto("/dashboard");
  await expect(page.getByText("Failed to load dashboard totals.")).toBeVisible();
  await expect(page.getByText("Active properties", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("17", { exact: true })).toBeVisible();
});
