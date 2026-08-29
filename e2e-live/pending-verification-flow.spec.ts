import { expect, test } from "@playwright/test";

const pendingAuthState = {
  state: {
    mfaEnabled: false,
    totpEnabled: false,
    email: "pending.browser.test@example.com",
    roleId: 1,
    step: "verify",
    inviteToken: null,
    roles: [],
    roleName: [],
    permissions: [],
    propertyIds: [],
    propertyNames: [],
    activeRole: null,
  },
  version: 0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    window.localStorage.setItem("auth-storage", JSON.stringify(state));
  }, pendingAuthState);
});

test("pending verification cannot drift into registration", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/verify-code$/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
});

test("pending verification cannot drift back into sign in", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/verify-code$/);
  await expect(page.getByText("pending.browser.test@example.com")).toBeVisible();
});

test("using a different account explicitly clears pending state", async ({ page }) => {
  await page.goto("/verify-code");
  await page.getByRole("button", { name: "Use a different account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("auth-storage") || "{}"));
  expect(stored.state.email).toBeNull();
  expect(stored.state.step).toBe("role");
});
