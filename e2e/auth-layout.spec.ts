import { expect, test } from "@playwright/test";

test.describe("login layout guardrails", () => {
  test("keeps the desktop form readable and proportionate", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/login");

    const panelBox = await page.getByTestId("auth-form-panel").boundingBox();
    const shellBox = await page.getByTestId("auth-form-shell").boundingBox();

    expect(panelBox).not.toBeNull();
    expect(shellBox).not.toBeNull();
    expect(panelBox!.width / 1920).toBeGreaterThanOrEqual(0.37);
    expect(panelBox!.width / 1920).toBeLessThanOrEqual(0.43);
    expect(shellBox!.width).toBeGreaterThanOrEqual(500);
    await expect(page.getByTestId("auth-visual-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCSS("font-size", "36px");
    await expect(page.getByLabel("Email Address")).toHaveCSS("height", "44px");
  });

  test("uses the available width without overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const shellBox = await page.getByTestId("auth-form-shell").boundingBox();
    expect(shellBox).not.toBeNull();
    expect(shellBox!.width).toBeGreaterThanOrEqual(330);
    await expect(page.getByTestId("auth-visual-panel")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
