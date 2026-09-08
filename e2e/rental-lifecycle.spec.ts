import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const envelope = (data: unknown[]) => ({ success: true, code: "S00000", description: "Success", data, size: 100, totalPages: 1, totalElements: data.length });

test("lease list errors can be retried and pagination reaches older leases", async ({context,page}) => {
  await authenticated(context,page,{title:"Tenant",permissions:["view_active_lease","view_lease_document"]});
  let failed = true;
  await page.route("**/lease/list**", route => {
    if (failed) return route.fulfill({status:503,json:{description:"Lease service unavailable"}});
    const second = new URL(route.request().url()).searchParams.get("page") === "1";
    return route.fulfill({json:{...envelope([{id:second?52:51,name:second?"Older lease":"Current lease",signed:true,lifecycleStatus:"ACTIVE"}]),totalPages:2}});
  });
  await page.goto("/dashboard/lease/operations");
  await expect(page.getByRole("button",{name:"Retry leases"})).toBeVisible();
  await expect(page.getByText("No accessible leases.")).toHaveCount(0);
  failed=false;
  await page.getByRole("button",{name:"Retry leases"}).click();
  await expect(page.getByText("Current lease",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Next leases"}).click();
  await expect(page.getByText("Older lease",{exact:true})).toBeVisible();
  await expect(page.getByText("Current lease",{exact:true})).toHaveCount(0);
});

for (const mobile of [false,true]) {
  test(`lease PDF opens in-page with a download fallback (${mobile?"mobile":"desktop"})`, async ({context,page}) => {
    if(mobile) await page.setViewportSize({width:390,height:844});
    await authenticated(context,page,{title:"Tenant",permissions:["view_lease_document"]});
    await page.route(/\/lease\/documents(?:[/?]|$)/,route=>{
      if(new URL(route.request().url()).pathname.endsWith("/91/pdf")) return route.fulfill({contentType:"application/pdf",body:"%PDF-1.4\n% test fixture\n%%EOF"});
      return route.fulfill({json:envelope([{id:91,leaseId:51,name:"Rental Agreement",status:"SIGNED",documentType:"RESIDENTIAL_LEASE_AGREEMENT",templateVersion:1}])});
    });
    const response = await page.goto("/dashboard/documents?leaseId=51");
    expect(response?.headers()["content-security-policy"]).toContain("frame-src blob: https://accounts.google.com");
    const tabs = context.pages().length;
    await page.getByRole("button",{name:"PDF",exact:true}).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link",{name:"Download PDF"})).toHaveAttribute("href",/^blob:/);
    await expect(page.getByTitle("Rental Agreement - SIGNED - 91 PDF preview")).toBeVisible();
    expect(context.pages()).toHaveLength(tabs);
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("a failed PDF response is not opened as a document and can be retried", async ({context,page}) => {
  await authenticated(context,page,{title:"Tenant",permissions:["view_lease_document"]});
  let failed=true;
  await page.route(/\/lease\/documents(?:[/?]|$)/,route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith("/91/pdf")) return failed ? route.fulfill({json:{success:false,description:"Not accessible"}}) : route.fulfill({contentType:"application/pdf",body:"%PDF-1.4\n%%EOF"});
    expect(url.searchParams.get("unitId")).toBe("31");
    return route.fulfill({json:envelope([{id:91,name:"Rental Agreement",status:"DRAFT",documentType:"RESIDENTIAL_LEASE_AGREEMENT",templateVersion:1}])});
  });
  await page.goto("/dashboard/documents?unitId=31");
  await page.getByRole("button",{name:"PDF",exact:true}).click();
  await expect(page.getByRole("button",{name:"Retry PDF"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Download PDF"})).toHaveCount(0);
  failed=false;
  await page.getByRole("button",{name:"Retry PDF"}).click();
  await expect(page.getByRole("link",{name:"Download PDF"})).toBeVisible();
});

test("lease operations routes drafts through governed documents and records a termination notice", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_active_lease", "create_lease_document", "delete_lease"] });
  let notice: unknown;
  await page.route("**/lease/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/lease/list")) {
      await route.fulfill({ json: envelope([
        { id: 41, name: "Apartment A offer", leaseMode: "RENT", tenantName: "Jane Tenant", signed: false, lifecycleStatus: "DRAFT", expiryDate: "2027-08-31" },
        { id: 42, name: "Apartment B lease", leaseMode: "RENT", tenantName: "John Tenant", signed: true, lifecycleStatus: "ACTIVE", expiryDate: "2027-08-31" },
      ]) });
      return;
    }
    if (path.endsWith("/lease/42/termination") && request.method() === "POST") {
      notice = request.postDataJSON(); await route.fulfill({ json: envelope([]) }); return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/lease/operations");
  await expect(page.getByRole("link", { name: "Prepare or continue agreement" })).toHaveAttribute("href", "/dashboard/documents?leaseId=41&type=RESIDENTIAL_LEASE_AGREEMENT");

  await page.getByRole("button", { name: "Give termination notice" }).click();
  await page.getByLabel("Termination effective date").fill("2027-08-31");
  await page.getByLabel("Termination reason").fill("Tenant notice and scheduled move-out");
  await page.getByRole("button", { name: "Record notice" }).click();
  await expect.poll(() => notice).toEqual({ effectiveDate: "2027-08-31", reason: "Tenant notice and scheduled move-out" });
});

test("tenant can continue to the governed agreement and sees no owner catalogue navigation", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_active_lease", "view_lease_document", "view_property", "view_property_list", "view_lease_template"] });
  await page.route("**/lease/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/lease/list")) {
      await route.fulfill({ json: envelope([{
        id: 51,
        name: "Tenant lease proposal",
        leaseMode: "RENT",
        tenantName: "Mama Njeri",
        signed: false,
        lifecycleStatus: "DRAFT",
        expiryDate: "2027-08-31",
        tenantSignDate: "2026-09-04",
        ownerSignDate: null,
        governedDocumentRequired: true,
        agreementDocumentId: 91,
        agreementStatus: "ISSUED",
      }]) });
      return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/lease/operations");
  await expect(page.getByText("Tenant signature: completed")).toBeVisible();
  await expect(page.getByText("Landlord/manager signature: pending")).toBeVisible();
  await expect(page.getByRole("link", { name: "View and sign agreement" }))
    .toHaveAttribute("href", "/dashboard/documents?leaseId=51");
  await expect(page.getByText("Properties", { exact: true })).toHaveCount(0);
  await expect(page.getByText("All Properties", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Lease templates", { exact: true })).toHaveCount(0);
});

test("tenant is not sent to an empty document page while the landlord prepares the agreement", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_active_lease", "view_lease_document"] });
  await page.route("**/lease/list**", route => route.fulfill({ json: envelope([{
    id: 53,
    name: "Newly initialized lease",
    leaseMode: "RENT",
    tenantName: "Legacy Tenant",
    signed: false,
    lifecycleStatus: "DRAFT",
    governedDocumentRequired: true,
  }]) }));

  await page.goto("/dashboard/lease/operations");

  await expect(page.getByText("Agreement preparation: waiting for the landlord or manager to prepare the draft. You do not need to initialize the lease again.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View and sign agreement" })).toHaveCount(0);
});

test("tenant reviews the draft and sees clear two-party signing status without loading templates", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_lease_document", "acknowledge_lease_document", "sign_lease_document"] });
  let templateRequests = 0;
  await page.route("**/lease/documents**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/lease/documents/templates")) {
      templateRequests += 1;
      await route.fulfill({ status: 403, json: { success: false } });
      return;
    }
    if (path.endsWith("/lease/documents")) {
      await route.fulfill({ json: envelope([{
        id: 81, leaseId: 51, documentType: "RESIDENTIAL_LEASE_AGREEMENT", status: "DRAFT",
        name: "Apartment A-101 lease", templateVersion: 3, issuerUserId: 10, recipientUserId: 20,
        legalReviewRequired: false,
      }]) });
      return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/documents");
  await expect(page.getByRole("heading", { name: "My lease documents" })).toBeVisible();
  await expect(page.getByText(/Draft available for review/)).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign" })).toHaveCount(0);
  expect(templateRequests).toBe(0);
});

test("landlord creates a residential lease agreement without a sales offer letter", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["create_lease_document", "view_lease_document"] });
  let generated: unknown;
  await page.route("**/lease/documents**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/lease/documents/templates")) { await route.fulfill({ json: envelope([]) }); return; }
    if (path.endsWith("/lease/documents") && request.method() === "POST") {
      generated = request.postDataJSON(); await route.fulfill({ json: envelope([]) }); return;
    }
    if (path.endsWith("/lease/documents")) { await route.fulfill({ json: envelope([]) }); return; }
    await route.continue();
  });

  await page.goto("/dashboard/documents?leaseId=41&type=RESIDENTIAL_LEASE_AGREEMENT");
  await expect(page.getByLabel("Document type")).toHaveValue("RESIDENTIAL_LEASE_AGREEMENT");
  await expect(page.getByLabel("Lease", { exact: true })).toHaveValue("41");
  await page.getByLabel("Effective date").fill("2026-10-01");
  await page.getByLabel("Amount").fill("45000");
  await page.getByLabel("Additional schedule details").fill("No smoking inside the residence");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect.poll(() => generated).toEqual({
    leaseId: 41, documentType: "RESIDENTIAL_LEASE_AGREEMENT", effectiveDate: "2026-10-01",
    amount: 45000, currency: "KES", reason: "No smoking inside the residence",
  });
});
