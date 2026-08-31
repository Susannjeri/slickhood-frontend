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

test("production auth contract rejects unknown credentials without a server error", async ({ request }) => {
  const response = await request.post("/api/auth/login", {
    data: {
      email: "auth-contract-probe@example.invalid",
      password: "InvalidProbe9!",
    },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({ success: false });
  expect(typeof body.code).toBe("string");
  expect(typeof body.description).toBe("string");
});

test("production browser session rejects malformed access tokens", async ({ request }) => {
  const response = await request.post("/browser-session/set-cookie", {
    data: { token: "not-a-jwt", refreshToken: "long-but-invalid-refresh-token" },
  });
  expect(response.status()).toBe(400);
});

test("production sign-in remains reachable with a stale valid-looking cookie", async ({ page, context }) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const stale = `${encode({ alg: "none" })}.${encode({ sub: "stale@example.invalid", exp: Math.floor(Date.now() / 1000) + 900, roles: [] })}.stale`;
  await context.addCookies([{
    name: "token",
    value: stale,
    domain: "app.slickhood.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }]);

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
