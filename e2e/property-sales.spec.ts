import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const pageEnvelope=(data:unknown[])=>({success:true,code:"s00000",description:"Success",data,size:25,totalPages:data.length?1:0,totalElements:data.length});

test("sales owner starts an email-bound sale from scoped property and unit selectors",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit"]});
 await page.route("**/property/list**",route=>route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])}));
 await page.route("**/property/unit/list**",route=>route.fulfill({json:pageEnvelope([{unitId:77,propertyId:11,ref:"A-07",currency:"KES",price:15000000,leaseMode:"SALE"}])}));
 await page.route("**/sales**",async route=>{
  if(new URL(route.request().url()).pathname!=="/sales"){await route.continue();return}
  if(route.request().method()==="POST"){await route.fulfill({json:{success:true,code:"S00290",description:"Sale workflow created.",data:[]}});return}
  await route.fulfill({json:pageEnvelope([])});
 });

 await page.goto("/dashboard/sales");
 await page.getByRole("combobox").nth(0).click();
 await page.getByRole("option",{name:"Acacia Court"}).click();
 await page.getByRole("combobox").nth(1).click();
 await page.getByRole("option",{name:/A-07/}).click();
 await page.getByLabel("Buyer email").fill("newbuyer@example.com");
 await expect(page.getByLabel("Asking price")).toHaveValue("15000000");
 const requestPromise=page.waitForRequest(request=>request.url().includes("/sales")&&request.method()==="POST");
 await page.getByRole("button",{name:"Start sale and invite buyer"}).click();
 const body=await requestPromise.then(request=>request.postDataJSON());
 expect(body).toMatchObject({propertyId:11,unitId:77,buyerEmail:"newbuyer@example.com",askingPrice:15000000,currency:"KES"});
 expect(body.buyerUserId).toBeUndefined();
});

test("buyer is routed to review and sign the sale letter of offer",async({context,page})=>{
 await authenticated(context,page,{title:"Buyer",permissions:["view_sale_pipeline","accept_sale_offer"]});
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/dashboard/sales"){await route.continue();return}
  await route.fulfill({json:pageEnvelope([{id:91,propertyId:11,unitId:77,salesAgentUserId:100,buyerUserId:200,invitedBuyerEmail:"buyer@example.com",status:"OFFERED",askingPrice:15000000,offerAmount:14500000,currency:"KES"}])});
 });

 await page.goto("/dashboard/sales");
 await expect(page.getByText("Offer: KES 14,500,000")).toBeVisible();
 await expect(page.getByRole("link",{name:"Review and sign letter of offer"})).toHaveAttribute("href","/dashboard/documents?saleId=91&type=PROPERTY_SALE_LETTER_OF_OFFER&amount=14500000&currency=KES");
});
