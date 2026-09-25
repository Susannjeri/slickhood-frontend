import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

const pageEnvelope=(data:unknown[])=>({success:true,code:"s00000",description:"Success",data,size:25,totalPages:data.length?1:0,totalElements:data.length});

test("sale unit exposes its live status and opens the prefilled buyer invitation from the top action",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit","view_account"],propertyIds:[11],propertyNames:["Acacia Court"]});
 await page.route("**/property/type**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:"APARTMENT",name:"Apartment"}]}}));
 await page.route("**/property/unit/type**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:"TWO_BEDROOM",name:"Two bedroom"}]}}));
 await page.route("**/property/measurement/units**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:1,name:"sqm"}]}}));
 await page.route("**/property/unit/charges?unitId=77",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}}));
 await page.route("**/maintenance/unit/77",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}}));
 await page.route("**/lease/documents**",route=>route.fulfill({json:pageEnvelope([])}));
 await page.route("**/property/list**",route=>route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])}));
 const unit={unitId:77,propertyId:11,ref:"A-07",unitType:"TWO_BEDROOM",propertyType:"APARTMENT",size:88,measurementUnits:{id:1,name:"sqm"},utilities:[],currency:"KES",price:15000000,leaseMode:"SALE",occupied:false,advertise:false,thumbnail:"",images:[],templateId:null,lifecycle:{code:"AVAILABLE_SALE",label:"Available for sale",description:"No buyer journey is active.",invitationBlocked:false,activeInviteId:null,journeyId:null}};
 await page.route("**/property/unit/77",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:unit}}));
 await page.route("**/property/unit/77/images",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}}));
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/lease/documents/templates",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:9,documentType:"PROPERTY_SALE_LETTER_OF_OFFER",legalReviewRequired:false,legalReviewedAt:"2026-09-01T10:00:00"}]}}));
 await page.route("**/sales**",route=>new URL(route.request().url()).pathname==="/dashboard/sales"
  ? route.continue()
  : route.fulfill({json:pageEnvelope([])}));

 await page.goto("/dashboard/unit/details/77?p=11&from=sale");
 await expect(page.getByText("Available for sale",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("No buyer journey is active.",{exact:true}).first()).toBeVisible();
 await page.getByRole("button",{name:"Invite buyer"}).first().click();

 await expect(page).toHaveURL(/\/dashboard\/sales\?propertyId=11&unitId=77#invite-buyer$/);
 await expect(page.getByText("Selected sale unit")).toBeVisible();
 await expect(page.getByText("A-07",{exact:true})).toBeVisible();
 await expect(page.getByLabel("Buyer email")).toBeVisible();
 await expect(page.getByLabel("Buyer response due")).toBeVisible();
 await expect(page.getByLabel("Sale unit")).toHaveCount(0);
});

test("sales owner starts an email-bound sale from scoped property and unit selectors",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit","view_account"]});
 await page.route("**/property/list**",route=>route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])}));
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/lease/documents/templates",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:9,documentType:"PROPERTY_SALE_LETTER_OF_OFFER",legalReviewRequired:false,legalReviewedAt:"2026-09-01T10:00:00"}]}}));
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
 await expect(page.getByLabel("Agreed offer amount")).toHaveValue("15000000");
 const requestPromise=page.waitForRequest(request=>request.url().includes("/sales")&&request.method()==="POST");
 await page.getByRole("button",{name:"Send invitation and Letter of Offer"}).click();
 const body=await requestPromise.then(request=>request.postDataJSON());
 expect(body).toMatchObject({propertyId:11,unitId:77,buyerEmail:"newbuyer@example.com",askingPrice:15000000,offerAmount:15000000,currency:"KES"});
 expect(body.responseDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 expect(body.buyerUserId).toBeUndefined();
});

test("selected sale unit opens a prefilled two-field buyer invitation",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit","view_account"],propertyIds:[11],propertyNames:["Acacia Court"]});
 let propertyQuery="",unitQuery="";
 await page.route("**/property/list**",route=>{propertyQuery=route.request().url();return route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])})});
 await page.route("**/property/unit/list**",route=>{unitQuery=route.request().url();return route.fulfill({json:pageEnvelope([{unitId:77,propertyId:11,ref:"A-07",unitType:"TWO_BEDROOM",size:88,measurementUnits:{name:"sqm"},currency:"KES",price:15000000,leaseMode:"SALE"}])})});
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/lease/documents/templates",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:9,documentType:"PROPERTY_SALE_LETTER_OF_OFFER",legalReviewRequired:false,legalReviewedAt:"2026-09-01T10:00:00"}]}}));
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path!=="/sales"&&path!=="/api/sales"){await route.continue();return}
  if(route.request().method()==="POST"){await route.fulfill({json:{success:true,code:"S00290",description:"Sale workflow created.",data:[]}});return}
  await route.fulfill({json:pageEnvelope([])});
 });

 await page.goto("/dashboard/sales?propertyId=11&unitId=77");
 await expect(page.getByText("Selected sale unit")).toBeVisible();
 await expect(page.getByText("Acacia Court").last()).toBeVisible();
 await expect(page.getByText("A-07",{exact:true})).toBeVisible();
 await expect(page.getByText("KES 15,000,000")).toBeVisible();
 expect(new URL(propertyQuery).searchParams.get("propertyId")).toBe("11");
 expect(new URL(unitQuery).searchParams.get("unitId")).toBe("77");
 await expect(page.getByLabel("Property filter (optional)")).toHaveCount(0);
 await expect(page.getByLabel("Sale unit")).toHaveCount(0);
 await expect(page.getByLabel("Asking price from unit")).toHaveCount(0);
 await expect(page.getByLabel("Agreed offer amount")).toHaveCount(0);
 await expect(page.getByLabel("Currency from unit")).toHaveCount(0);
 await expect(page.getByLabel("Internal notes")).toHaveCount(0);

 await page.getByLabel("Buyer email").fill("selected-buyer@example.com");
 await page.getByLabel("Buyer response due").fill("2026-09-30");
 const requestPromise=page.waitForRequest(request=>request.url().includes("/sales")&&request.method()==="POST");
 await page.getByRole("button",{name:"Send invitation and Letter of Offer"}).click();
 expect((await requestPromise).postDataJSON()).toMatchObject({propertyId:11,unitId:77,buyerEmail:"selected-buyer@example.com",askingPrice:15000000,offerAmount:15000000,responseDueDate:"2026-09-30",currency:"KES"});
});

test("sales owner sees how to resolve an existing active sale before inviting again",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_property","view_unit","view_account"]});
 await page.route("**/property/list**",route=>route.fulfill({json:pageEnvelope([{id:11,name:"Acacia Court",managementMode:"SALE"}])}));
 await page.route("**/property/unit/list**",route=>route.fulfill({json:pageEnvelope([{unitId:77,propertyId:11,ref:"A-07",currency:"KES",price:15000000,leaseMode:"SALE"}])}));
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/lease/documents/templates",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:9,documentType:"PROPERTY_SALE_LETTER_OF_OFFER",legalReviewRequired:false,legalReviewedAt:"2026-09-01T10:00:00"}]}}));
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/dashboard/sales"){await route.continue();return}
  await route.fulfill({json:pageEnvelope([{id:91,propertyId:11,propertyName:"Acacia Court",unitId:77,unitRef:"A-07",salesAgentUserId:100,buyerUserId:200,buyerEmail:"existing@example.com",status:"OFFERED",askingPrice:15000000,offerAmount:14500000,currency:"KES"}])});
 });

 await page.goto("/dashboard/sales");
 await page.locator("#invite-buyer").scrollIntoViewIfNeeded();
 await page.getByRole("combobox").nth(1).click();
 await page.getByRole("option",{name:/A-07/}).click();
 const conflict=page.getByRole("alert").filter({hasText:"This unit already has an active sale"});
 await expect(conflict).toContainText("This unit already has an active sale");
 await expect(conflict).toContainText("Continue sale #91 for existing@example.com, currently at Offered");
 await expect(page.getByRole("button",{name:"Existing sale must be continued or cancelled"})).toBeDisabled();
});

test("buyer is routed to review and sign the sale letter of offer",async({context,page})=>{
 await authenticated(context,page,{title:"Buyer",permissions:["view_sale_pipeline","accept_sale_offer"]});
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/dashboard/sales"){await route.continue();return}
  await route.fulfill({json:pageEnvelope([{id:91,propertyId:11,unitId:77,salesAgentUserId:100,buyerUserId:200,invitedBuyerEmail:"buyer@example.com",status:"OFFERED",askingPrice:15000000,offerAmount:14500000,currency:"KES"}])});
 });

 await page.goto("/dashboard/sales");
 await expect(page.getByRole("heading",{name:"My Property Purchases"})).toBeVisible();
 await expect(page.getByText("Next:")).toBeVisible();
 await expect(page.getByText("Review and sign the letter of offer.")).toBeVisible();
 await expect(page.getByText("Offer: KES 14,500,000")).toBeVisible();
 await expect(page.getByRole("link",{name:"Review and sign letter of offer"})).toHaveAttribute("href","/dashboard/documents?saleId=91&type=PROPERTY_SALE_LETTER_OF_OFFER&amount=14500000&currency=KES");
});

test("buyer opens the exact participant-scoped sale invoice",async({context,page})=>{
 await authenticated(context,page,{title:"Buyer",permissions:["view_sale_pipeline","accept_sale_offer","view_invoice_list"]});
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/dashboard/sales"){await route.continue();return}
  await route.fulfill({json:pageEnvelope([{id:91,propertyId:11,propertyName:"Acacia Court",unitId:77,unitRef:"A-07",salesAgentUserId:100,buyerUserId:200,buyerEmail:"buyer@example.com",status:"RESERVED",askingPrice:15000000,offerAmount:14500000,escrowInvoiceId:301,escrowRequiredAmount:250000,currency:"KES"}])});
 });
 await page.goto("/dashboard/sales");
 await expect(page.getByText("Pay the sale invoice and follow due diligence.")).toBeVisible();
 await expect(page.getByRole("link",{name:"Pay sale invoice #301"})).toHaveAttribute("href","/dashboard/invoices?invoiceId=301");
});

test("sales escrow is backed by a buyer invoice and never a typed payment reference",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline","view_account"]});
 let invoiced=false;
 const base={id:5,propertyId:11,propertyName:"Acacia Court",unitId:77,unitRef:"A-07",salesAgentUserId:100,buyerUserId:200,buyerEmail:"buyer@example.com",status:"RESERVED",askingPrice:15000000,offerAmount:14500000,currency:"KES"};
 await page.route("**/account/list**",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:81,name:"Sales collections",channel:"MPESA",channelDisplayName:"M-Pesa",category:"PROPERTY_SALES",active:true,verified:true}]}}));
 await page.route("**/lease/documents/templates",route=>route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[{id:9,documentType:"PROPERTY_SALE_LETTER_OF_OFFER",legalReviewRequired:false,legalReviewedAt:"2026-09-01T10:00:00"}]}}));
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
 await expect(page.getByRole("button", { name: "Billing", exact: true })).toBeVisible();
 await page.getByRole("button", { name: "Billing", exact: true }).click();
 await expect(page.getByRole("link", { name: "Receiving accounts" })).toHaveAttribute("href", "/dashboard/sales/accounts");
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

test("sales staff upload categorized evidence instead of entering internal document ids",async({context,page})=>{
 await authenticated(context,page,{title:"SalesAgent",permissions:["view_sale_pipeline","manage_sale_pipeline"]});
 const sale={id:5,propertyId:11,propertyName:"Acacia Court",unitId:77,unitRef:"A-07",salesAgentUserId:100,buyerUserId:200,buyerEmail:"buyer@example.com",status:"DUE_DILIGENCE",askingPrice:15000000,offerAmount:14500000,currency:"KES"};
 let uploaded=false,recorded=false;
 await page.route("**/sales/5/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith("/evidence")&&route.request().method()==="POST"){
   const body=route.request().postData()??"";
   expect(body).toContain("DUE_DILIGENCE");
   expect(body).toContain("registry.pdf");
   uploaded=true;
   await route.fulfill({json:{success:true,code:"S00297",description:"Evidence uploaded.",data:[{id:41,saleId:5,category:"DUE_DILIGENCE",displayName:"registry.pdf",contentType:"application/pdf",fileSize:18,downloadUrl:"https://private.example/evidence"}]}});return;
  }
  if(path.endsWith("/milestones")&&route.request().method()==="POST"){
   expect(route.request().postDataJSON()).toEqual({type:"DUE_DILIGENCE_CHECK",status:"COMPLETED",evidenceAttachmentId:41,externalReference:"REG-2026-41",notes:"Registry search completed."});
   recorded=true;
   await route.fulfill({json:{success:true,code:"S00293",description:"Milestone saved.",data:[]}});return;
  }
  if(path.endsWith("/milestones")){await route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}});return}
  if(path.endsWith("/evidence")){await route.fulfill({json:{success:true,code:"s00000",description:"Success",data:[]}});return}
  await route.continue();
 });
 await page.route("**/sales**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/sales"||path==="/api/sales"){await route.fulfill({json:pageEnvelope([sale])});return}
  await route.continue();
 });

 await page.goto("/dashboard/sales");
 await page.getByText("Due diligence, verified payment and handover evidence").click();
 await page.getByRole("combobox").filter({hasText:"Select milestone"}).click();
 await page.getByRole("option",{name:"Due Diligence Check"}).click();
 await page.getByLabel("Supporting evidence").setInputFiles({name:"registry.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7 evidence")});
 await page.getByLabel("Supporting record reference").fill("REG-2026-41");
 await page.getByLabel("Verification notes").fill("Registry search completed.");
 await page.getByRole("button",{name:"Record completed milestone"}).click();
 await expect.poll(()=>uploaded&&recorded).toBe(true);
 await expect(page.getByText("Evidence document ID")).toHaveCount(0);
});
