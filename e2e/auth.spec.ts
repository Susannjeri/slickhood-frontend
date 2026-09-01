import { expect, test } from "@playwright/test";
import { envelope, testToken } from "./support";

test("an unauthenticated dashboard visit is sent to sign in", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.goto("/dashboard/privacy");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign-in form validates malformed credentials before the API call", async ({ page }) => {
  let loginCalls = 0;
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => { loginCalls += 1; return route.abort(); });
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("not-an-email");
  await page.getByPlaceholder("••••••••").fill("short");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email")).toBeVisible();
  expect(loginCalls).toBe(0);
});

test("sign in remains available when a previous registration stopped at verification", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        email: "unfinished@example.test",
        step: "verify",
        roleId: 1,
        inviteToken: null,
        roles: [],
        roleName: [],
        permissions: [],
        propertyIds: [],
        propertyNames: [],
        activeRole: null,
      },
      version: 0,
    }));
  });
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("an unverified account is sent to email verification instead of a tokenless dashboard", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      code: "EMAIL_OTP_GENERATED",
      description: "A verification code was sent to your email.",
      data: ["verification-code-generated"],
    }),
  }));

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("owner@example.test");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/verify-code$/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page.getByText("owner@example.test")).toBeVisible();
});

test("a successful credential login creates the secure session and leaves the login page", async ({ page, context }) => {
  const jwt = testToken([
    { title: "Landlord", permissions: [] },
    { title: "ServiceProvider", permissions: [] },
  ]);
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(envelope([{
      jwt,
      refreshToken: "refresh-token-longer-than-sixteen-characters",
      totpEnabled: false,
      mfaSetup: true,
    }])),
  }));
  await page.route("**/kyc/current", route => route.fulfill({ json: envelope([{
    status: "APPROVED", accountStatus: "ACTIVE", phoneVerified: true,
    requirements: [], missingRequirements: [], documents: [],
  }]) }));
  await page.route("**/subscription/current**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("  Owner@Example.com ");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "token")?.httpOnly).toBe(true);
  expect(cookies.find(cookie => cookie.name === "refreshToken")?.httpOnly).toBe(true);
});

test("an expired access cookie cannot trap the user in a login-dashboard redirect loop", async ({ page, context }) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expired = `${encode({ alg: "none" })}.${encode({ sub: "expired", exp: 1, roles: [] })}.expired`;
  await context.addCookies([{ name: "token", value: expired, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("a valid-looking stale cookie cannot make the sign-in page unreachable", async ({ page, context }) => {
  const stale = testToken([{ title: "Landlord", permissions: [] }]);
  await context.addCookies([{ name: "token", value: stale, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("the browser session endpoint rejects malformed tokens", async ({ request }) => {
  const response = await request.post("/browser-session/set-cookie", {
    data: { token: "not-a-jwt", refreshToken: "long-but-invalid-refresh-token" },
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ success: false });
});

test("a large multi-role token survives the secure cookie handoff", async ({ page, context }) => {
  const permissions = Array.from({ length: 35 }, (_, index) => `permission_${index}_${"x".repeat(20)}`);
  const jwt = testToken([
    { title: "Landlord", permissions },
    { title: "EstateManager", permissions },
    { title: "SalesAgent", permissions },
  ]);
  expect(jwt.length).toBeGreaterThan(4_096);

  const response = await page.request.post("/browser-session/set-cookie", {
    data: { token: jwt, refreshToken: "refresh-token-longer-than-sixteen-characters" },
  });
  expect(response.status()).toBe(200);

  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "token")).toBeUndefined();
  expect(cookies.find(cookie => cookie.name === "tokenChunks")?.httpOnly).toBe(true);
  const tokenChunks = cookies.filter(cookie => /^token\.\d+$/.test(cookie.name));
  expect(tokenChunks.length).toBeGreaterThan(1);
  expect(tokenChunks.every(cookie => cookie.value.length <= 3_500 && cookie.httpOnly)).toBe(true);

  // The production cookie is Secure. Re-add the captured values without Secure so
  // Playwright's HTTP-only local web server can exercise reconstruction and Proxy.
  await context.clearCookies();
  await context.addCookies(cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: false,
    sameSite: cookie.sameSite,
  })));

  const retrieved = await page.request.get("/browser-session/get-token");
  expect(retrieved.status()).toBe(200);
  await expect(retrieved.json()).resolves.toMatchObject({ data: { jwt } });

  const protectedPage = await page.request.get("/continue-setup", { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(200);

  await page.request.post("/browser-session/clear-cookie");
  const cleared = await context.cookies();
  expect(cleared.some(cookie => cookie.name === "token" || cookie.name === "tokenChunks" || /^token\.\d+$/.test(cookie.name))).toBe(false);
});

test("password reset verifies ownership and enforces the registration password policy", async ({ page }) => {
  await page.route("**/otp/options**", route => route.fulfill({ json: envelope([{ email: true, phone: false, google: false, preferred: "EMAIL" }]) }));
  await page.route("**/otp/send**", route => route.fulfill({ json: envelope(["sent"]) }));
  let resetPayload: Record<string, unknown> | undefined;
  await page.route("**/otp/verify", route => {
    resetPayload = route.request().postDataJSON();
    return route.fulfill({ json: envelope([{ jwt: testToken([{ title: "Landlord", permissions: [] }]), refreshToken: "reset-refresh" }]) });
  });
  await page.route("**/browser-session/set-cookie", route => route.fulfill({ json: { success: true } }));

  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@example.com").fill("owner@example.test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Email Verification/ }).click();
  await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();
  await page.locator("input").fill("A1B2C3");
  await page.getByRole("button", { name: "Continue" }).click();

  const passwordFields = page.getByPlaceholder("••••••••");
  await passwordFields.nth(0).fill("alllowercase1");
  await passwordFields.nth(1).fill("alllowercase1");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect(page.getByText("Include an uppercase letter")).toBeVisible();
  expect(resetPayload).toBeUndefined();

  await passwordFields.nth(0).fill("StrongPass1!");
  await passwordFields.nth(1).fill("StrongPass1!");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect.poll(() => resetPayload).toBeTruthy();
  expect(resetPayload).toMatchObject({ code: "A1B2C3", email: "owner@example.test", channel: "EMAIL", password: "StrongPass1!" });
});
