import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const envelope = (data: unknown[]) => ({ success: true, code: "S00000", description: "Success", data, size: 100, totalPages: 1, totalElements: data.length });

test("lease operations uses POST for signing and records a termination notice", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_active_lease", "sign_lease", "delete_lease"] });
  let signed = false;
  let notice: unknown;
  await page.route("**/lease/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/lease/list") {
      await route.fulfill({ json: envelope([{ id: 41, name: "Apartment A lease", leaseMode: "RENT", tenantName: "Jane Tenant", signed, lifecycleStatus: signed ? "ACTIVE" : "DRAFT", expiryDate: "2027-08-31" }]) });
      return;
    }
    if (path === "/lease/sign" && request.method() === "POST") {
      signed = true; await route.fulfill({ json: envelope([]) }); return;
    }
    if (path === "/lease/41/termination" && request.method() === "POST") {
      notice = request.postDataJSON(); await route.fulfill({ json: envelope([]) }); return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/lease/operations");
  const signRequest = page.waitForRequest(request => new URL(request.url()).pathname === "/lease/sign");
  await page.getByRole("button", { name: "Sign lease" }).click();
  expect((await signRequest).method()).toBe("POST");
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Give termination notice" }).click();
  await page.getByLabel("Termination effective date").fill("2027-08-31");
  await page.getByLabel("Termination reason").fill("Tenant notice and scheduled move-out");
  await page.getByRole("button", { name: "Record notice" }).click();
  await expect.poll(() => notice).toEqual({ effectiveDate: "2027-08-31", reason: "Tenant notice and scheduled move-out" });
});
