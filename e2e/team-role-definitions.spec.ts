import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const areas = ["LANDLORD", "ESTATE_MANAGEMENT", "PROPERTY_SALE_MANAGEMENT"];
const catalogue = [
  { permissionTemplate: "VIEWER", displayName: "Viewer", businessAreas: areas },
  { permissionTemplate: "GUARD", displayName: "Guard", businessAreas: areas },
  { permissionTemplate: "SECURITY_SUPERVISOR", displayName: "Security supervisor", businessAreas: areas },
  { permissionTemplate: "LEASING_OFFICER", displayName: "Leasing officer", businessAreas: ["LANDLORD"] },
  { permissionTemplate: "LISTING_AGENT", displayName: "Listing agent", businessAreas: ["PROPERTY_SALE_MANAGEMENT"] },
];

test("shared security roles remain available across categories while specialists stay restricted", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: [] });
  let saved: unknown;
  await page.route("**/team-access/role-templates", route => route.fulfill({ json: envelope(catalogue) }));
  await page.route("**/team-access/role-definitions", async route => {
    if (route.request().method() === "POST") saved = route.request().postDataJSON();
    await route.fulfill({ json: envelope([]) });
  });
  await page.goto("/dashboard/team-role-definitions");
  await page.getByRole("button", { name: "Add user type" }).click();
  await page.getByLabel("Security template", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Guard", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Security supervisor", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Listing agent", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "Leasing officer", exact: true }).click();
  await page.getByLabel("Business area", { exact: true }).click();
  await page.getByRole("option", { name: "Estate Management", exact: true }).click();
  await expect(page.getByLabel("Security template", { exact: true })).toHaveText("Viewer");
  await page.getByLabel("Security template", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Leasing officer", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Security supervisor", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Guard", exact: true }).click();
  await page.getByLabel("Business area", { exact: true }).click();
  await page.getByRole("option", { name: "Property Sale Management", exact: true }).click();
  await expect(page.getByLabel("Security template", { exact: true })).toHaveText("Guard");
  await page.getByLabel("Security template", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Listing agent", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Security supervisor", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Guard", exact: true }).click();
  await page.getByLabel("Display name").fill("Sales gate guard");
  await page.getByLabel("System code").fill("SALE_GATE_GUARD");
  await page.getByRole("button", { name: "Save user type" }).click();
  await expect.poll(() => saved).toEqual({ code: "SALE_GATE_GUARD", displayName: "Sales gate guard", description: "", businessArea: "PROPERTY_SALE_MANAGEMENT", permissionTemplate: "GUARD" });
});

test("unavailable template metadata blocks changes and supports retry", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: [] });
  let failed = true;
  await page.route("**/team-access/role-definitions", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/team-access/role-templates", route => route.fulfill({ json: envelope(failed ? null : catalogue) }));
  await page.goto("/dashboard/team-role-definitions");
  await expect(page.getByText("Could not load team user types. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add user type" })).toBeDisabled();
  failed = false;
  await page.getByRole("button", { name: "Retry loading user types" }).click();
  await expect(page.getByRole("button", { name: "Add user type" })).toBeEnabled();
});
