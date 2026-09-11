import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const document = {id:81, propertyId:11, unitId:77, documentType:"ESTATE_RESIDENTIAL_AGREEMENT",
  name:"Estate Residential Agreement", status:"SIGNED", templateVersion:1,
  issuerSignedAt:"2026-09-07T09:00", recipientSignedAt:"2026-09-07T10:00"};

for (const role of ["Homeowner","EstateManager"]) {
  test(`${role} opens the selected home's agreement PDF on mobile`, async ({context,page}) => {
    await page.setViewportSize({width:390,height:844});
    await authenticated(context,page,{title:role,permissions:["view_estate","view_lease_document"]});
    await page.route("**/estate/ownership**",route=>route.fulfill({json:envelope([{
      id:9, propertyId:11, unitId:77, homeownerUserId:2, propertyName:"Acacia Estate", unitRef:"A-101",
      homeownerName:"Test Homeowner", homeownerEmail:"owner@example.test", ownershipStart:"2026-09-01", active:true,
    }])}));
    await page.route(/\/lease\/documents(?:[/?]|$)/,route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/81/pdf")) return route.fulfill({contentType:"application/pdf",body:"%PDF-1.4\n% viewer fixture\n%%EOF"});
      expect(url.searchParams.get("propertyId")).toBe("11");
      expect(url.searchParams.get("unitId")).toBe("77");
      return route.fulfill({json:{...envelope([document]),totalPages:1}});
    });
    await page.goto("/dashboard/estate");
    await page.getByRole("link",{name:"View agreement",exact:true}).click();
    await expect(page).toHaveURL(/unitId=77/);
    await expect(page.getByText(/The estate manager and homeowner have signed/)).toBeVisible();
    await page.getByRole("button",{name:"PDF",exact:true}).click();
    await expect(page.getByRole("link",{name:"Download PDF"})).toHaveAttribute("href",/^blob:/);
    await expect(page.getByRole("link",{name:"Open PDF"})).toHaveAttribute("href",/^blob:/);
    await expect(page.getByTitle("Estate Residential Agreement - SIGNED - 81 PDF preview")).toBeHidden();
    await expect(page.getByRole("button",{name:"Sign",exact:true})).toHaveCount(0);
  });
}

test("linked homeowner beyond the first choices page stays selected and submits the exact ownership",async({context,page})=>{
  await authenticated(context,page,{title:"EstateManager",permissions:["view_lease_document","create_lease_document"]});
  await page.route("**/estate/ownership**",route=>{
    expect(new URL(route.request().url()).searchParams.get("propertyId")).toBe("11");
    return route.fulfill({json:{...envelope([{id:1,propertyId:11,homeownerUserId:2,unitId:76,homeownerName:"Same owner, different home",ownershipStart:"2026-08-01"}]),totalPages:2}});
  });
  await page.route("**/lease/documents**",route=>route.fulfill({json:envelope([])}));
  await page.goto("/dashboard/documents?propertyId=11&unitId=77&recipientUserId=2&ownershipId=900&effectiveDate=2026-09-01&type=ESTATE_RESIDENTIAL_AGREEMENT");
  await expect(page.getByLabel("Homeowner and property")).toHaveValue("900");
  await expect(page.getByLabel("Homeowner and property")).toBeDisabled();
  await expect(page.getByLabel("Effective date")).toHaveValue("2026-09-01");
  const request=page.waitForRequest(r=>r.method()==="POST"&&new URL(r.url()).pathname.endsWith("/lease/documents"));
  await page.getByRole("button",{name:"Create draft",exact:true}).click();
  expect((await request).postDataJSON()).toMatchObject({ownershipId:900,propertyId:11,recipientUserId:2,effectiveDate:"2026-09-01"});
});

test("template failure does not hide issued estate documents and retry recovers",async({context,page})=>{
  await authenticated(context,page,{title:"EstateManager",permissions:["view_lease_document","create_lease_document"]});
  await page.route("**/estate/ownership**",route=>route.fulfill({json:envelope([])}));
  let failure=true;
  await page.route("**/lease/documents**",route=>{
    if(new URL(route.request().url()).pathname.endsWith("/templates")) return failure
      ? route.fulfill({status:503,json:{description:"Template service unavailable"}})
      : route.fulfill({json:envelope([])});
    return route.fulfill({json:{...envelope([document]),totalPages:1}});
  });
  await page.goto("/dashboard/documents?propertyId=11&type=ESTATE_RESIDENTIAL_AGREEMENT");
  await expect(page.getByRole("button",{name:"Retry templates"})).toBeVisible();
  await expect(page.getByRole("button",{name:"PDF",exact:true})).toBeVisible();
  failure=false; await page.getByRole("button",{name:"Retry templates"}).click();
  await expect(page.getByRole("button",{name:"Retry templates"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"PDF",exact:true})).toBeVisible();
});
