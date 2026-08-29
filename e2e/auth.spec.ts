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
