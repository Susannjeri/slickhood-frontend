import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["view_lease_template", "create_lease_template", "view_property"],
  });
  await page.route(/\/lease\/template\?/, route => route.fulfill({
    json: {
      ...envelope([
        { id: 1, name: "DEFAULT_RENT", leaseMode: "RENT", leaseDurationInMonths: 12, rentDueDayOfMonth: 1, noticePeriodInMonths: 1, selfRenewable: true, petsPolicy: "Not allowed" },
        { id: 2, name: "DEFAULT_SALE", leaseMode: "SALE", selfRenew: false, petsPolicy: "Written approval required" },
      ]),
      totalPages: 1,
      totalElements: 2,
    },
  }));
});

test("agreement template page explains defaults and where templates are selected", async ({ page }) => {
  await page.goto("/dashboard/lease/templates");

  await expect(page.getByRole("heading", { name: "Agreement templates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How agreement templates work" })).toBeVisible();
  await expect(page.getByText("Choose the template when creating or editing a unit.")).toBeVisible();
  await expect(page.getByText("SlickHood rental agreement")).toBeVisible();
  await expect(page.getByText("SlickHood sale agreement")).toBeVisible();
  await expect(page.getByText("SlickHood default", { exact: true })).toHaveCount(2);
  await expect(page.getByLabel("Show:")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Manage properties and units/i })).toHaveAttribute("href", "/dashboard/property/properties");
});
