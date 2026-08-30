import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("My Wealth remains usable with incomplete legacy portfolio records", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_wealth"] });

  await page.route("**/wealth/dashboard**", route => route.fulfill({ json: envelope({
    summary: { currency: "", netWorth: null, totalAssetValue: null },
    assets: [null, {
      assetId: 7,
      name: "Legacy rental",
      assetType: "PROPERTY",
      currency: "",
      value: null,
      income: null,
      netOperatingIncome: null,
      totalUnits: null,
      arrears: null,
    }],
    obligations: [null],
    goals: null,
    goalProgress: null,
    insights: [null],
    projection: [null],
  }) }));
  await page.route("**/wealth/assets", route => route.fulfill({ json: envelope([null, {
    id: 7,
    assetType: "PROPERTY",
    name: "Legacy rental",
    currency: "",
    currentValue: null,
    status: "ACTIVE",
  }]) }));
  await page.route("**/wealth/property-options", route => route.fulfill({ json: envelope([null]) }));
  await page.route("**/wealth/assets/7/vault", route => route.fulfill({ json: envelope([null]) }));

  await page.goto("/dashboard/wealth");

  await expect(page.getByRole("heading", { name: "Your financial command centre." })).toBeVisible();
  await expect(page.getByText("Legacy rental").first()).toBeVisible();
  await expect(page.getByText("Application error:")).toHaveCount(0);
});
