import { expect, test } from "@playwright/test";
import { envelope, testToken } from "../e2e/support";

test("the production domain accepts its restricted Google Maps key", async ({ context, page }) => {
  const role = {
    title: "Landlord",
    permissions: ["create_property", "view_property"],
    propertyIds: [],
    propertyNames: [],
  };
  const token = testToken([role]);
  await context.addCookies([{
    name: "token",
    value: token,
    domain: "app.slickhood.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }]);
  await page.addInitScript(({ persistedRole }) => {
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        email: "maps-domain-check@slickhood.test",
        step: "complete",
        roles: [persistedRole],
        roleName: [persistedRole.title],
        permissions: persistedRole.permissions,
        propertyIds: [],
        propertyNames: [],
        activeRole: persistedRole,
      },
      version: 0,
    }));
  }, { persistedRole: role });

  await page.route("**/api/kyc/current", route => route.fulfill({ json: envelope([{
    id: 1,
    status: "APPROVED",
    accountStatus: "ACTIVE",
    phoneVerified: true,
    requirements: [],
    missingRequirements: [],
    documents: [],
  }]) }));
  await page.route("**/api/property/type**", route => route.fulfill({ json: envelope([{
    id: "APARTMENT_BLOCK",
    name: "Apartment",
    category: "RESIDENTIAL",
    displayOrder: 0,
    common: true,
  }]) }));

  const mapErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (/Google Maps JavaScript API error|RefererNotAllowedMapError|ApiNotActivatedMapError|InvalidKeyMapError/i.test(text)) {
      mapErrors.push(text);
    }
  });

  const scriptResponse = page.waitForResponse(response =>
    response.url().startsWith("https://maps.googleapis.com/maps/api/js"),
  );
  await page.goto("/dashboard/property/create");
  await page.getByRole("button", { name: /Rental property/i }).click();

  expect((await scriptResponse).ok()).toBe(true);
  await expect(page.locator(".gm-style")).toBeVisible();
  await expect(page.getByLabel("Search for a property location")).toBeVisible();
  expect(mapErrors).toEqual([]);
});
