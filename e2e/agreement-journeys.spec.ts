import { expect, test, Page } from "@playwright/test";
import { authenticated, envelope } from "./support";

const base = { id: 61, leaseId: 11, propertyId: 21, unitId: 31, documentType: "RESIDENTIAL_LEASE_AGREEMENT",
  status: "ISSUED", name: "Residential Lease Agreement", templateVersion: 1, issuerUserId: 1, recipientUserId: 2,
  legalReviewRequired: false, viewerParty: "RECIPIENT" };
async function documents(page: Page, values: unknown[]) {
  await page.route("**/lease/documents**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/templates")) return route.fulfill({ json: envelope([]) });
    if (path.endsWith("/branding")) return route.fulfill({ json: envelope({ configured: false }) });
    return route.fulfill({ json: { ...envelope(values), totalPages: 1 } });
  });
}

test("tenant reviews and signs once, then waits for landlord", async ({ context, page }) => {
  await authenticated(context,page,{title:"Tenant",permissions:["view_lease_document","sign_lease_document","acknowledge_lease_document"]});
  await documents(page,[base]);
  let signed=false;
  await page.route("**/lease/documents/61/sign", route => {
    signed=true; return route.fulfill({json:envelope({})});
  });
  await page.route("**/lease/documents**", route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith("/61/sign")){signed=true;return route.fulfill({json:envelope({})})}
    return route.fulfill({json:{...envelope([{...base,...(signed?{status:"PARTIALLY_SIGNED",recipientSignedAt:"2026-09-06T12:00:00"}:{})}]),totalPages:1}});
  });
  await page.goto("/dashboard/documents?leaseId=11");
  await expect(page.getByRole("heading",{name:"My lease documents"})).toBeVisible();
  page.on("dialog", dialog=>dialog.accept());
  await page.getByRole("button",{name:"Sign",exact:true}).click();
  await expect(page.getByText("You signed. Waiting for the landlord or manager to sign.")).toBeVisible();
  await expect(page.getByRole("button",{name:"Sign",exact:true})).toHaveCount(0);
});

test("landlord cannot countersign an unsigned tenant agreement", async ({context,page})=>{
  await authenticated(context,page,{title:"Landlord",permissions:["view_lease_document","sign_lease_document"]});
  await documents(page,[{...base,viewerParty:"ISSUER"}]);
  await page.goto("/dashboard/documents");
  await expect(page.getByText("Issuer: Not signed · Recipient: Not signed")).toBeVisible();
  await expect(page.getByRole("button",{name:"Sign",exact:true})).toHaveCount(0);
});

test("buyer sees the selected offer, signing state and automatic reservation explanation",async({context,page})=>{
  await authenticated(context,page,{title:"Buyer",permissions:["view_lease_document","sign_lease_document"]});
  await documents(page,[{...base,leaseId:undefined,saleId:91,name:"Property Sale Letter of Offer",documentType:"PROPERTY_SALE_LETTER_OF_OFFER"}]);
  let query="";
  page.on("request",r=>{if(r.url().includes("/lease/documents?"))query=r.url()});
  await page.goto("/dashboard/documents?saleId=91&type=PROPERTY_SALE_LETTER_OF_OFFER");
  await expect(page.getByText("Both signatures reserve the sale automatically. No separate acceptance is needed.")).toBeVisible();
  expect(new URL(query).searchParams.get("saleId")).toBe("91");
  await expect(page.getByRole("button",{name:"Sign",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Create draft",exact:true})).toHaveCount(0);
});

test("unapproved draft cannot issue and its issuer can cancel for replacement",async({context,page})=>{
  await authenticated(context,page,{title:"Landlord",permissions:["view_lease_document","create_lease_document","issue_lease_document"]});
  await documents(page,[{...base,viewerParty:"ISSUER",status:"DRAFT",legalReviewRequired:true}]);
  await page.route("**/lease/list**",r=>r.fulfill({json:envelope([])}));
  await page.goto("/dashboard/documents");
  await expect(page.getByRole("button",{name:"Issue",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Cancel draft"})).toBeVisible();
});

test("estate agreement identifies one of a homeowner's multiple units",async({context,page})=>{
  await authenticated(context,page,{title:"EstateManager",permissions:["view_lease_document","create_lease_document"]});
  await documents(page,[]);
  await page.route("**/estate/ownership**",r=>r.fulfill({json:{...envelope([1,2].map(id=>({id,propertyId:21,unitId:30+id,homeownerUserId:2,propertyName:"Acacia",unitRef:`A-${id}`,homeownerName:"Homeowner",homeownerEmail:"homeowner@example.test",ownershipStart:"2026-09-01",active:true}))),totalPages:1}}));
  await page.goto("/dashboard/documents?type=ESTATE_RESIDENTIAL_AGREEMENT");
  await page.getByLabel("Homeowner and property").selectOption("2");
  await expect(page.getByLabel("Effective date")).toHaveValue("2026-09-01");
  const request=page.waitForRequest(r=>r.method()==="POST"&&new URL(r.url()).pathname.endsWith("/lease/documents"));
  await page.getByRole("button",{name:"Create draft",exact:true}).click();
  expect((await request).postDataJSON()).toMatchObject({propertyId:21,recipientUserId:2,ownershipId:2,documentType:"ESTATE_RESIDENTIAL_AGREEMENT"});
});

test("document load failure is not presented as an empty successful list",async({context,page})=>{
  await authenticated(context,page,{title:"Homeowner",permissions:["view_lease_document"]});
  await page.route("**/lease/documents**",r=>r.fulfill({status:503,json:{message:"Unavailable"}}));
  await page.goto("/dashboard/documents");
  await expect(page.getByRole("button",{name:"Retry",exact:true})).toBeVisible();
  await expect(page.getByText("No documents match this account and selection.")).toHaveCount(0);
});
