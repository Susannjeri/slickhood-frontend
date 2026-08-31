import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["create_property", "view_property", "create_unit", "view_account", "view_invoice_list"],
  });
  await page.route("**/property/type**", route => route.fulfill({
    json: envelope([
      { id: "APARTMENT_BLOCK", name: "Apartment", description: "Multi-unit residential property", category: "RESIDENTIAL", displayOrder: 0, common: true },
      { id: "STANDALONE_HOUSE", name: "House", description: "A standalone home", category: "RESIDENTIAL", displayOrder: 1, common: true },
      { id: "AIRBNB_UNIT", name: "Airbnb / Short Stay", description: "Short-stay accommodation", category: "HOSPITALITY", displayOrder: 2, common: true },
      { id: "WAREHOUSE", name: "Warehouse", description: "Industrial storage", category: "INDUSTRIAL", displayOrder: 400, common: false },
    ]),
  }));
});

test("property creation remains usable when Google Maps is not configured", async ({ page }) => {
  const mapRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("maps.googleapis.com/maps/api/js")) mapRequests.push(request.url());
  });

  await page.goto("/dashboard/property/create");

  await expect(page.getByRole("heading", { name: "What do you want to manage?" })).toBeVisible();
  await page.getByRole("button", { name: /Rental property/i }).click();
  await expect(page.getByRole("heading", { name: "Create new property" })).toBeVisible();
  await expect(page.getByText(/Map search is temporarily unavailable/i)).toBeVisible();
  const coordinates = page.getByLabel("Coordinates (Latitude, Longitude)");
  await expect(coordinates).toBeEditable();
  await coordinates.fill("-1.286389, 36.817223");
  await expect(coordinates).toHaveValue("-1.286389, 36.817223");
  expect(mapRequests).toHaveLength(0);
});

test("property creation preserves the selected management workflow", async ({ page }) => {
  await page.goto("/dashboard/property/create");
  await page.getByRole("button", { name: /Rental property/i }).click();

  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ef4217";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#image-upload").setInputFiles({
    name: "property.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngBase64, "base64"),
  });
  await page.getByLabel("Property name *").fill("Sunset Villa");
  await page.getByLabel("Property type *").selectOption("APARTMENT_BLOCK");
  await page.getByLabel("Address *").fill("123 Main Street, Nairobi");
  await page.getByLabel("Coordinates (Latitude, Longitude) *").fill("-1.286389, 36.817223");

  const requestPromise = page.waitForRequest(request => request.url().includes("/property/create") && request.method() === "POST");
  await page.route("**/property/create", route => route.fulfill({
    status: 409,
    json: { success: false, code: "TEST", description: "Captured by the browser test" },
  }));
  await page.getByRole("button", { name: "Create property" }).click();
  const request = await requestPromise;
  const body = request.postData() || "";

  expect(body).toContain('name="managementMode"');
  expect(body).toContain("RENTAL");
  expect(body).toContain('name="image"; filename="property.png"');
});

test("property types put common choices first and group specialised choices", async ({ page }) => {
  await page.goto("/dashboard/property/create");
  await page.getByRole("button", { name: /Rental property/i }).click();

  const propertyType = page.getByLabel("Property type *");
  await expect(propertyType.locator("optgroup").first()).toHaveAttribute("label", "Common property types");
  await expect(propertyType.locator("option").nth(1)).toHaveText("Apartment");
  await expect(propertyType.locator("option").nth(2)).toHaveText("House");
  await expect(propertyType.locator("optgroup[label='Industrial'] option")).toHaveText("Warehouse");
});

test("landlord navigation is grouped in task order", async ({ page }) => {
  await page.goto("/dashboard/property/create");

  const labels = page.locator('[data-sidebar="group-label"]');
  await expect(labels).toContainText(["Overview", "Property & Leasing", "Money", "Support"]);
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Properties", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();
});
