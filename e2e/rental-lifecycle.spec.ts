import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const envelope = (data: unknown[]) => ({ success: true, code: "S00000", description: "Success", data, size: 100, totalPages: 1, totalElements: data.length });

test("lease operations routes drafts through governed documents and records a termination notice", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_active_lease", "create_lease_document", "delete_lease"] });
  let notice: unknown;
  await page.route("**/lease/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/lease/list") {
      await route.fulfill({ json: envelope([
        { id: 41, name: "Apartment A offer", leaseMode: "RENT", tenantName: "Jane Tenant", signed: false, lifecycleStatus: "DRAFT", expiryDate: "2027-08-31" },
        { id: 42, name: "Apartment B lease", leaseMode: "RENT", tenantName: "John Tenant", signed: true, lifecycleStatus: "ACTIVE", expiryDate: "2027-08-31" },
      ]) });
      return;
    }
    if (path === "/lease/42/termination" && request.method() === "POST") {
      notice = request.postDataJSON(); await route.fulfill({ json: envelope([]) }); return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/lease/operations");
  await expect(page.getByRole("link", { name: "Manage offer & agreement" })).toHaveAttribute("href", "/dashboard/documents?leaseId=41&type=RENTAL_LETTER_OF_OFFER");

  await page.getByRole("button", { name: "Give termination notice" }).click();
  await page.getByLabel("Termination effective date").fill("2027-08-31");
  await page.getByLabel("Termination reason").fill("Tenant notice and scheduled move-out");
  await page.getByRole("button", { name: "Record notice" }).click();
  await expect.poll(() => notice).toEqual({ effectiveDate: "2027-08-31", reason: "Tenant notice and scheduled move-out" });
});

test("landlord creates the rental letter of offer before the tenancy agreement", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["create_lease_document", "view_lease_document"] });
  let generated: unknown;
  await page.route("**/lease/documents**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/lease/documents/templates") { await route.fulfill({ json: envelope([]) }); return; }
    if (path === "/lease/documents" && request.method() === "POST") {
      generated = request.postDataJSON(); await route.fulfill({ json: envelope([]) }); return;
    }
    if (path === "/lease/documents") { await route.fulfill({ json: envelope([]) }); return; }
    await route.continue();
  });

  await page.goto("/dashboard/documents?leaseId=41&type=RENTAL_LETTER_OF_OFFER");
  await expect(page.getByLabel("Document type")).toHaveValue("RENTAL_LETTER_OF_OFFER");
  await expect(page.getByLabel("Lease ID")).toHaveValue("41");
  await page.getByLabel("Effective date").fill("2026-10-01");
  await page.getByLabel("Response due").fill("2026-09-15");
  await page.getByLabel("Amount").fill("45000");
  await page.getByLabel("Reason / additional terms").fill("Offer subject to signing the residential tenancy agreement");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect.poll(() => generated).toEqual({
    leaseId: 41, documentType: "RENTAL_LETTER_OF_OFFER", effectiveDate: "2026-10-01",
    responseDueDate: "2026-09-15", amount: 45000, currency: "KES",
    reason: "Offer subject to signing the residential tenancy agreement",
  });
});
