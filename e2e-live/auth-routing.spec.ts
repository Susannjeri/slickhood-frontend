import { expect, test } from "@playwright/test";

test("production sign-in posts only to the SlickHood API", async ({ page }) => {
  const loginUrls: string[] = [];

  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", async route => {
    loginUrls.push(route.request().url());
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        code: "S0004",
        description: "Incorrect credentials.",
        data: [],
      }),
    });
  });

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("login-routing-probe@example.test");
  await page.getByPlaceholder("••••••••").fill("InvalidProbe9!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Incorrect credentials.")).toBeVisible();
  expect(loginUrls).toEqual(["https://app.slickhood.com/api/auth/login"]);
});
