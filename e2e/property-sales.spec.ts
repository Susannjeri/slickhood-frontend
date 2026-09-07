import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const pageEnvelope=(data:unknown[])=>({success:true,code:"s00000",description:"Success",data,size:25,totalPages:data.length?1:0,totalElements:data.length});

test("sales owner starts an email-bound sale from scoped property and unit selectors",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit","view_account"]});
 await page.route("**/property/list**",route=>route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])}));
 let unitListUrl="";
 await page.route("**/property/unit/list**",route=>{unitListUrl=route.request().url();return route.fulfill({json:pageEnvelope([{unitId:77,propertyId:11,ref:"A-07",currency:"KES",price:15000000,leaseMode:"SALE"}])})});
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path!=="/sales"&&path!=="/api/sales"){await route.continue();return}
  if(route.request().method()==="POST"){await route.fulfill({json:{success:true,code:"S00290",description:"Sale workflow created.",data:[]}});return}
  await route.fulfill({json:pageEnvelope([])});
 });

 await page.goto("/dashboard/sales");
 await page.getByRole("combobox").nth(0).click();
 await page.getByRole("option",{name:"Acacia Court"}).click();
 await page.getByRole("combobox").nth(1).click();
 await page.getByRole("option",{name:/A-07/}).click();
 const unitQuery=new URL(unitListUrl).searchParams;
 expect(unitQuery.get("sort")).toBe("ref,asc");
 expect(unitQuery.get("leaseMode")).toBe("SALE");
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

test("sales escrow is backed by a buyer invoice and never a typed payment reference",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_account"]});
 let invoiced=false;
 const base={id:5,propertyId:11,propertyName:"Acacia Court",unitId:77,unitRef:"A-07",salesAgentUserId:100,buyerUserId:200,buyerEmail:"buyer@example.com",status:"RESERVED",askingPrice:15000000,offerAmount:14500000,currency:"KES"};
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",channelDisplayName:"M-Pesa",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/sales/5/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/escrow-invoice")&&route.request().method()==="POST"){
   expect(route.request().postDataJSON()).toEqual({amount:250000,paymentAccountId:81});
   invoiced=true;
   await route.fulfill({json:{success:true,code:"S00297",description:"Escrow invoice created.",data:[{invoiceId:301,invoiceRef:"INV-SALE-301",amount:250000,currency:"KES",paid:false,pendingAmount:250000,dueDate:"2026-09-11"}]}});return;
  }
  if(path.endsWith("/milestones")&&route.request().method()==="POST"){
   const body=route.request().postDataJSON();
   expect(body).toEqual({type:"ESCROW_FUNDED",status:"COMPLETED"});
   await route.fulfill({json:{success:true,code:"S00293",description:"Milestone saved.",data:[]}});return;
  }
  if(path.endsWith("/milestones")){await route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}});return}
  await route.continue();
 });
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/sales"||path==="/api/sales"){await route.fulfill({json:pageEnvelope([{...base,...(invoiced?{escrowInvoiceId:301,escrowRequiredAmount:250000}:{})}])});return}
  await route.continue();
 });

 await page.goto("/dashboard/sales");
 await expect(page.getByRole("link", { name: "Sales Payment Setup" })).toBeVisible();
 await page.getByText("Due diligence, verified payment and handover evidence").click();
 await page.getByRole("combobox").filter({hasText:"Select milestone"}).click();
 await page.getByRole("option",{name:"Escrow Funded"}).click();
 await page.getByLabel("Contractual escrow amount").fill("250000");
 await page.getByRole("combobox").filter({hasText:"Select verified Property Sales account"}).click();
 await page.getByRole("option",{name:"Sales collections · M-Pesa"}).click();
 await page.getByRole("button",{name:"Create buyer escrow invoice"}).click();
 await expect(page.getByText(/Buyer escrow invoice #301/)).toBeVisible();
 await expect(page.getByPlaceholder("Payment/external reference")).toHaveCount(0);
 await page.getByRole("button",{name:"Verify paid invoice and record escrow"}).click();
});
