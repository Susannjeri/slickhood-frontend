import { expect, test } from "@playwright/test";

test("verified user without a subscription resumes setup", async ({ page, context, request }) => {
  const email = process.env.SLICKHOOD_E2E_EMAIL;
  const password = process.env.SLICKHOOD_E2E_PASSWORD;
  test.skip(!email || !password, "Live E2E credentials were not provided.");

  const login = await request.post("https://app.slickhood.com/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  const body = await login.json();
  const jwt = body.data?.[0]?.jwt as string | undefined;
  expect(jwt).toBeTruthy();

  await context.addCookies([{
    name: "token",
    value: jwt!,
    domain: "app.slickhood.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }]);

  const restoredSession = await context.request.get("https://app.slickhood.com/browser-session/get-token");
  expect(restoredSession.ok()).toBeTruthy();

  await page.route("**/api/subscription/current**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, code: "S00192", description: "No current subscription", data: [] }),
  }));

  await page.goto("/continue-setup");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Let's continue where you left off.")).toBeVisible();
  await expect(page.getByText("Your account and email are verified")).toBeVisible();
  await expect(page.getByText(/Complete your Rental Management plan and free-trial setup/)).toBeVisible();

  await page.getByRole("button", { name: "Continue setup" }).click();
  await expect(page).toHaveURL(/\/business-areas\/plans\?area=property-management$/);
});
