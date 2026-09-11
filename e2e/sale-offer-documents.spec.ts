import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("sales failure can be retried and older transactions remain accessible",async({context,page})=>{
 await authenticated(context,page,{title:"Buyer",permissions:["view_sale_pipeline","view_lease_document"]});
 let fail=true;
 await page.route(/\/sales(?:\?|$)/,route=>{
  if(new URL(route.request().url()).pathname.includes("dashboard"))return route.continue();
  if(fail)return route.fulfill({status:503,json:{description:"Sales temporarily unavailable"}});
  const second=new URL(route.request().url()).searchParams.get("page")==="1";
  return route.fulfill({json:{...envelope([{id:second?92:91,propertyId:11,propertyName:second?"Older Purchase":"Current Purchase",unitId:77,unitRef:second?"B-02":"A-01",status:"RESERVED",askingPrice:1000,currency:"KES"}]),totalPages:2,totalElements:26}});
 });
 await page.goto("/dashboard/sales");
 await expect(page.getByRole("button",{name:"Retry sales"})).toBeVisible();
 await expect(page.getByText("No property sale transactions for this active role.")).toHaveCount(0);
 fail=false;await page.getByRole("button",{name:"Retry sales"}).click();
 await expect(page.getByText("Current Purchase",{exact:true}).first()).toBeVisible();
 await page.getByRole("button",{name:"Next",exact:true}).click();
 await expect(page.getByText("Older Purchase",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("Current Purchase",{exact:true})).toHaveCount(0);
});

for(const role of ["SalesAgent","Buyer"]){
 test(`${role} can open the signed offer from a reserved sale on mobile`,async({context,page})=>{
  await page.setViewportSize({width:390,height:844});
  await authenticated(context,page,{title:role,permissions:["view_sale_pipeline","view_lease_document"]});
  await page.route(/\/sales(?:\?|$)/,route=>{
   if(new URL(route.request().url()).pathname.includes("dashboard"))return route.continue();
   return route.fulfill({json:{...envelope([{id:91,propertyId:11,unitId:77,status:"RESERVED",askingPrice:1000,currency:"KES"}]),totalPages:1}});
  });
  await page.route(/\/lease\/documents(?:[/?]|$)/,route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith("/71/pdf"))return route.fulfill({contentType:"application/pdf",body:"%PDF-1.4\n% UI fixture\n%%EOF"});
   expect(url.searchParams.get("saleId")).toBe("91");
   return route.fulfill({json:{...envelope([{id:71,saleId:91,name:"Property Sale Letter of Offer",documentType:"PROPERTY_SALE_LETTER_OF_OFFER",status:"SIGNED",templateVersion:1,issuerSignedAt:"2026-09-01T10:00",recipientSignedAt:"2026-09-01T11:00"}]),totalPages:1}});
  });
  await page.goto("/dashboard/sales");
  await expect(page.getByRole("link",{name:"View sale documents and signing status",exact:true})).toHaveCount(0);
  await page.getByRole("link",{name:"View letters, agreements and signing status"}).click();
  await expect(page).toHaveURL(/saleId=91/);
  await page.getByRole("button",{name:"PDF",exact:true}).click();
  await expect(page.getByRole("link",{name:"Download PDF"})).toHaveAttribute("href",/^blob:/);
  await expect(page.getByRole("link",{name:"Open PDF"})).toHaveAttribute("href",/^blob:/);
  await expect(page.getByTitle("Property Sale Letter of Offer - SIGNED - 71 PDF preview")).toBeHidden();
  await expect(page.getByRole("button",{name:"Sign",exact:true})).toHaveCount(0);
 });
}

test("expired letter remains viewable but offers no signing or acknowledgement",async({context,page})=>{
 await authenticated(context,page,{title:"Buyer",permissions:["view_lease_document","sign_lease_document","acknowledge_lease_document"]});
 await page.route(/\/lease\/documents(?:[/?]|$)/,route=>route.fulfill({json:{...envelope([{id:71,saleId:91,name:"Expired letter",documentType:"PROPERTY_SALE_LETTER_OF_OFFER",status:"EXPIRED",viewerParty:"RECIPIENT",templateVersion:1,responseDueDate:"2020-01-01"}]),totalPages:1}}));
 await page.goto("/dashboard/documents?saleId=91");
 await expect(page.getByText(/This offer has expired/)).toBeVisible();
 await expect(page.getByRole("button",{name:"PDF",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Acknowledge",exact:true})).toHaveCount(0);
 await expect(page.getByText("Both signatures reserve the sale automatically. No separate acceptance is needed.")).toHaveCount(0);
});
