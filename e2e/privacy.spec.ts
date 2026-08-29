import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test.beforeEach(async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
});

test("a user can submit a tracked erasure request and sees the retention warning", async ({ page }) => {
  let requests: any[] = [];
  await page.route("**/privacy/requests/my?*", route => route.fulfill({ json: envelope(requests) }));
  await page.route("**/privacy/requests", async route => {
    const body = route.request().postDataJSON();
    requests = [{ id: 41, type: body.type, status: "SUBMITTED", reason: body.reason, submittedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 30 * 86400000).toISOString(), legalHold: false }];
    await route.fulfill({ json: envelope(requests[0]) });
  });

  await page.goto("/dashboard/privacy");
  await expect(page.getByRole("heading", { name: "Your information, under your control" })).toBeVisible();
  await page.getByRole("button", { name: /Erase my account data/i }).click();
  await expect(page.getByText(/Erasure is not immediate/i)).toBeVisible();
  await page.getByPlaceholder("Tell the privacy team what you need…").fill("Please close my test account and erase eligible records.");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText(/#41 · Erasure/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /open request of this type/i })).toBeDisabled();
});

test("portable export downloads as JSON without navigating away", async ({ page }) => {
  await page.route("**/privacy/requests/my?*", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/privacy/export", route => route.fulfill({
    contentType: "application/json",
    headers: { "Content-Disposition": "attachment; filename=slickhood-personal-data.json" },
    body: JSON.stringify({ generatedAt: new Date().toISOString(), user: { email: "e2e@slickhood.test" }, roles: ["Landlord"] }),
  }));
  await page.goto("/dashboard/privacy");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const download = await downloadPromise;
  await expect(page).toHaveURL(/\/dashboard\/privacy$/);
  expect(download.suggestedFilename()).toMatch(/^slickhood-personal-data-\d{4}-\d{2}-\d{2}\.json$/);
});
