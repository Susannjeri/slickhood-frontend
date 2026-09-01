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
  await page.route("**/wealth/asset-types", route => route.fulfill({ json: envelope([{id:1,code:"PROPERTY",label:"Property",displayOrder:10,marketPricingAllowed:false,active:true}]) }));
  await page.route("**/wealth/vault", route => route.fulfill({ json: envelope([null]) }));

  await page.goto("/dashboard/wealth");

  await expect(page.getByRole("heading", { name: "Your financial command centre." })).toBeVisible();
  await expect(page.getByText("Legacy rental").first()).toBeVisible();
  await expect(page.getByText("Application error:")).toHaveCount(0);
});

test("vault lists metadata and requests an owner-scoped link only when opened", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_wealth"] });
  let secureLinkRequests = 0;
  await page.route("**/wealth/dashboard**", route => route.fulfill({ json: envelope({
    summary: { currency: "KES" }, assets: [], obligations: [], goals: [], goalProgress: [], insights: [], projection: [],
  }) }));
  await page.route("**/wealth/assets", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/wealth/property-options", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/wealth/asset-types", route => route.fulfill({ json: envelope([{id:1,code:"PROPERTY",label:"Property",displayOrder:10,marketPricingAllowed:false,active:true}]) }));
  await page.route("**/wealth/vault/9", route => {
    secureLinkRequests += 1;
    return route.fulfill({ json: envelope({ document: { id: 9, category: "WILL", displayName: "will.pdf", contentType: "application/pdf", fileSize: 128, checksumSha256: "abc" }, downloadUrl: "about:blank#protected-document" }) });
  });
  await page.route("**/wealth/vault", route => route.fulfill({ json: envelope([
    { document: { id: 9, category: "WILL", displayName: "will.pdf", contentType: "application/pdf", fileSize: 128, checksumSha256: "abc" }, downloadUrl: null },
  ]) }));

  await page.goto("/dashboard/wealth");
  await page.getByRole("tab", { name: "Document vault" }).click();
  const documentButton = page.getByRole("button", { name: /^will\.pdf WILL/i });
  await expect(documentButton).toBeVisible();
  expect(secureLinkRequests).toBe(0);
  await documentButton.click();
  await expect.poll(() => secureLinkRequests).toBe(1);
});
