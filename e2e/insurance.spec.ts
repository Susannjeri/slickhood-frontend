import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

const product={code:"MOTOR",name:"Motor Insurance",description:"Private vehicle protection.",subjectTypes:["VEHICLE"]};

test("customer can submit a minimal Silverwood quote request",async({context,page})=>{
 let submitted:Record<string,unknown>|undefined;
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",r=>r.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([{id:1,code:"APA",name:"APA Insurance",active:true,logoUrl:"/insurance/brands/apa.webp"}])}));
 await page.route("**/insurance/cases",async route=>{if(route.request().method()==="POST"){submitted=route.request().postDataJSON();return route.fulfill({json:envelope({id:1,reference:"INS-2026-TEST",status:"SUBMITTED"})})}return route.fulfill({json:envelope([])})});
 for(const endpoint of ["policies","claims","documents"])await page.route(`**/insurance/${endpoint}`,r=>r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance");
 await expect(page.getByRole("heading",{name:"Insurance protection, made clear and connected."})).toBeVisible();
 await expect(page.getByRole("img",{name:"Silverwood Insurance Agency logo"})).toBeVisible();
 await expect(page.getByRole("img",{name:"APA Insurance logo"})).toBeVisible();
 await page.getByRole("button",{name:/Request a quote/}).first().click();
 const dialog=page.getByRole("dialog");await expect(dialog.getByRole("heading",{name:"Request Motor Insurance"})).toBeVisible();
 await dialog.getByLabel("Full name").fill("Amina Kamau");await dialog.getByLabel("Phone").fill("0712345678");await dialog.getByLabel("Email").fill("amina@example.com");
 await dialog.getByLabel("Registration number").fill("KDA 123A");await dialog.getByLabel("Vehicle make and model").fill("2019 Toyota Fielder");await dialog.getByLabel("Age of driver").fill("36");await dialog.getByLabel("Estimated value").fill("1000000");
 await dialog.getByRole("button",{name:"Add another"}).click();await dialog.getByLabel("Registration number").nth(1).fill("KDB 456B");await dialog.getByLabel("Vehicle make and model").nth(1).fill("Mercedes Actros");await dialog.getByLabel("Age of driver").nth(1).fill("42");await dialog.getByLabel("Estimated value").nth(1).fill("500000");
 const coverStart=new Date(Date.now()+86_400_000).toISOString().slice(0,10);const coverStartInput=dialog.getByLabel("Preferred cover start");await expect(coverStartInput).toHaveAttribute("required","");await coverStartInput.fill(coverStart);
 await expect(dialog.getByTestId("proposal-estimated-total")).toContainText("1,500,000");await dialog.locator('input[type="checkbox"]').check();await dialog.getByRole("button",{name:"Submit request"}).click();
 await expect(page.getByText("Quote request submitted to Silverwood.")).toBeVisible();
 expect(submitted).toMatchObject({productCode:"MOTOR",subjectType:"VEHICLE",sumInsured:1500000,coverStartDate:coverStart,proposalData:{vehicles:[{insuredType:"VEHICLE",registrationNumber:"KDA 123A",makeModel:"2019 Toyota Fielder",driverAge:"36",estimatedValue:"1000000",specialType:""},{insuredType:"VEHICLE",registrationNumber:"KDB 456B",makeModel:"Mercedes Actros",driverAge:"42",estimatedValue:"500000",specialType:""}]}});
});

test("every Silverwood proposal supports repeatable risk items",async({context,page})=>{
 const repeatableProducts=[
  {code:"MOTOR",name:"Motor",description:"Motor",subjectTypes:["VEHICLE"],add:"Add another",remove:"Delete entry"},
  {code:"DOMESTIC",name:"Domestic Package",description:"Domestic",subjectTypes:["PROPERTY","HOUSEHOLD_ITEMS"],add:"Add item",remove:"Delete item"},
  {code:"FIRE_ALLIED",name:"Fire and Allied Perils",description:"Fire",subjectTypes:["PROPERTY"],add:"Add item",remove:"Delete item"},
  {code:"WIBA_EL",name:"WIBA",description:"WIBA",subjectTypes:["EMPLOYEES"],add:"Add job group",remove:"Delete job group"},
  {code:"CONTRACTORS_ALL_RISK",name:"Contractors' All Risk",description:"Construction",subjectTypes:["PROJECT"],add:"Add item",remove:"Delete item"},
  {code:"MEDICAL",name:"Medical",description:"Medical",subjectTypes:["FAMILY_INDIVIDUAL","CORPORATE"],add:"Add item",remove:"Delete item"},
  {code:"TRAVEL",name:"Travel",description:"Travel",subjectTypes:["PERSON"],add:"Add item",remove:"Delete item"},
  {code:"GOODS_IN_TRANSIT",name:"Goods in Transit",description:"Cargo",subjectTypes:["GOODS"],add:"Add item",remove:"Delete item"},
 ];
 await authenticated(context,page,{title:"Landlord",permissions:[]});
 await page.route("**/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",r=>r.fulfill({json:envelope(repeatableProducts)}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([])}));
 for(const endpoint of ["cases","policies","renewals","claims","documents"])await page.route(`**/insurance/${endpoint}`,r=>r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance");
 for(const item of repeatableProducts){
  await page.getByRole("heading",{name:item.name,exact:true}).locator("..").getByRole("button",{name:"Request a quote"}).click();
  const dialog=page.getByRole("dialog");
  const before=await dialog.getByRole("button",{name:item.remove}).count();
  await dialog.getByRole("button",{name:item.add}).first().click();
  await expect(dialog.getByRole("button",{name:item.remove})).toHaveCount(before+1);
  await dialog.getByRole("button",{name:item.remove}).last().click();
  await expect(dialog.getByRole("button",{name:item.remove})).toHaveCount(before);
  await dialog.getByRole("button",{name:"Cancel"}).click();
 }
});

test("marine cargo IDF OCR populates immutable declarations and supports several consignments",async({context,page})=>{
 let submitted:Record<string,unknown>|undefined,uploaded=0;
 const marine={code:"MARINE_CARGO",name:"Marine Cargo",description:"Marine cargo cover",subjectTypes:["GOODS"]};
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/agency",route=>route.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency"})}));
 await page.route("**/insurance/products",route=>route.fulfill({json:envelope([marine])}));
 await page.route("**/insurance/companies",route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/proposal-ocr/marine-idf",async route=>{const body=await route.request().postDataBuffer(),second=body?.includes(Buffer.from("SECOND"));return route.fulfill({json:envelope({idfNumber:second?"2026IM000124":"2026IM000123",importerName:"Example Importer Limited",importerPin:"P051234567A",origin:"China",portOfDischarge:"Mombasa",hsCode:"8703.23.90",descriptionAndApplication:second?"Industrial motors":"Industrial pumps",fobValue:second?"7500000":"5000000",transportMode:"SEA",netMass:second?"1800":"1250",quantity:second?"30":"20",unitOfMeasure:"PCS",confidence:96.2,reviewFields:[],extractionReference:second?"trusted-2":"trusted-1"})})});
 await page.route("**/insurance/cases",async route=>{if(route.request().method()==="POST"){submitted=route.request().postDataJSON();return route.fulfill({json:envelope({id:91,reference:"INS-2026-MARINE",status:"SUBMITTED"})})}return route.fulfill({json:envelope([])})});
 for(const endpoint of ["policies","renewals","claims"])await page.route(`**/insurance/${endpoint}`,route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/documents",route=>{if(route.request().method()==="POST")uploaded+=1;return route.fulfill({json:envelope(route.request().method()==="POST"?{id:uploaded}:[])});});
 await page.goto("/dashboard/insurance");
 await page.getByRole("button",{name:/Request a quote/}).first().click();
 const dialog=page.getByRole("dialog");
 await dialog.getByLabel("Full name").fill("Amina Kamau");await dialog.getByLabel("Phone").fill("0712345678");await dialog.getByLabel("Email").fill("amina@example.com");
 await dialog.getByLabel("Preferred cover start").fill(new Date(Date.now()+86_400_000).toISOString().slice(0,10));
 await dialog.getByLabel("Import Declaration Form (IDF / IM0)").setInputFiles({name:"first-idf.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4 FIRST")});
 await expect(dialog.getByLabel("IDF number")).toHaveValue("2026IM000123");await expect(dialog.getByLabel("Importer PIN")).toHaveAttribute("readonly","");await expect(dialog.getByLabel("FOB value")).toHaveAttribute("readonly","");
 await dialog.getByLabel("Import Declaration Form (IDF / IM0)").setInputFiles({name:"second-idf.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4 SECOND")});
 await expect(dialog.getByLabel("IDF number")).toHaveCount(2);await expect(dialog.getByTestId("proposal-estimated-total")).toContainText("12,500,000");
 await dialog.locator('input[type="checkbox"]').check();await dialog.getByRole("button",{name:"Submit request"}).click();
 await expect.poll(()=>uploaded).toBe(2);
 expect(submitted).toMatchObject({productCode:"MARINE_CARGO",sumInsured:12500000,proposalData:{consignments:[{idfNumber:"2026IM000123",importerName:"Example Importer Limited",fobValue:"5000000",quantity:"20"},{idfNumber:"2026IM000124",descriptionAndApplication:"Industrial motors",fobValue:"7500000",quantity:"30"}]}});
});

test("customer records payment and withdraws an eligible application with explicit dialogs",async({context,page})=>{
 let paymentPayload:Record<string,unknown>|undefined,withdrawn=false;
 const selected={id:44,reference:"INS-2026-PAY",productCode:"MOTOR",status:"CUSTOMER_SELECTED",fullName:"Amina Kamau",phone:"0712345678",email:"amina@example.com",subjectType:"VEHICLE",subjectDescription:"Toyota Fielder",sumInsured:1500000,currency:"KES",submittedAt:"2026-08-01T10:00:00",selectedQuoteId:9,quotes:[{id:9,status:"SELECTED",companyId:1,companyCode:"APA",companyName:"APA Insurance",totalPremium:25000,currency:"KES",basePremium:23000,taxesLevies:2000,coverageSummary:"Comprehensive",validUntil:"2026-12-01"}],payments:[]};
 const draft={...selected,id:45,reference:"INS-2026-DRAFT",status:withdrawn?"WITHDRAWN":"SUBMITTED",selectedQuoteId:undefined,quotes:[]};
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",route=>route.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/cases",route=>route.fulfill({json:envelope([selected,{...draft,status:withdrawn?"WITHDRAWN":"SUBMITTED"}])}));
 for(const endpoint of ["policies","claims","documents"])await page.route(`**/insurance/${endpoint}`,route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/cases/44/payments",async route=>{paymentPayload=route.request().postDataJSON();await route.fulfill({json:envelope({id:1,status:"PENDING_VERIFICATION"})})});
 await page.route("**/insurance/companies/APA/payment-options",route=>route.fulfill({json:envelope([{id:7,companyCode:"APA",companyName:"APA Insurance",accountName:"APA Premium Collection",channel:"MPESA",label:"Pay APA premium",instructions:"Use your application reference when paying.",referenceTemplate:"INS-YYYY-XXXX",paymentDetails:[{key:"paybill",label:"Paybill",description:"",value:"123456",displayField:true}]}])}));
 await page.route("**/insurance/cases/45/withdraw",async route=>{withdrawn=true;await route.fulfill({json:envelope({...draft,status:"WITHDRAWN"})})});
 await page.goto("/dashboard/insurance");
 await page.getByRole("button",{name:"Record payment"}).click();
 const paymentDialog=page.getByRole("dialog");
 await expect(paymentDialog.getByRole("heading",{name:"Pay the insurer and record payment"})).toBeVisible();
 await expect(paymentDialog.getByText("Paybill")).toBeVisible();await expect(paymentDialog.getByText("123456")).toBeVisible();
 await expect(paymentDialog.getByText("SlickHood does not receive or hold these funds.",{exact:false})).toBeVisible();
 await paymentDialog.getByLabel("Insurer or bank reference").fill("BANK-REF-881");
 await paymentDialog.getByRole("button",{name:"Save payment"}).click();
 await expect.poll(()=>paymentPayload?.paymentReference).toBe("BANK-REF-881");
 expect(paymentPayload?.paymentConfigurationId).toBe(7);
 await page.getByRole("button",{name:"Withdraw"}).click();
 await expect(page.getByRole("heading",{name:"Withdraw this application?"})).toBeVisible();
 await page.getByRole("button",{name:"Withdraw application"}).click();
 await expect.poll(()=>withdrawn).toBe(true);
});

test("authorised Silverwood staff can open the operations queue",async({context,page})=>{
 await authenticated(context,page,{title:"InsuranceManager",permissions:["review_insurance_applications","manage_insurance_quotes","manage_insurance_claims","manage_insurance_renewals","view_insurance_reports"]});
 await page.route("**/insurance/admin/operations/summary",r=>r.fulfill({json:envelope({openCases:3,unassignedCases:1,paymentsAwaitingVerification:2,openClaims:4,renewalsDue:5})}));
 await page.route("**/insurance/admin/staff",r=>r.fulfill({json:envelope([{id:7,fullName:"Amina Adviser",email:"amina@example.com",roleName:"INSURANCE_ADVISER"}])}));
 await page.route("**/insurance/admin/cases**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/admin/claims**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/admin/renewals**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance/operations");
 await expect(page.getByRole("heading",{name:"Silverwood Insurance Operations"})).toBeVisible();
 await expect(page.getByText("Payments to verify")).toBeVisible();await expect(page.getByText("2",{exact:true})).toBeVisible();
});

test("insurance adviser queue does not request manager reporting or show approval controls",async({context,page})=>{
 let summaryRequests=0,dispatched=false;
 await authenticated(context,page,{title:"InsuranceAdviser",permissions:["review_insurance_applications","manage_insurance_quotes","manage_insurance_claims","manage_insurance_renewals"]});
 await page.route("**/insurance/admin/operations/summary",r=>{summaryRequests+=1;return r.fulfill({status:403,json:envelope(null)})});
 await page.route("**/insurance/admin/cases**",r=>r.fulfill({json:envelope({content:[{id:1,reference:"INS-2026-TEST",productCode:"MOTOR",status:"QUOTED",fullName:"Amina Kamau",phone:"0712345678",email:"amina@example.com",subjectDescription:"Toyota Fielder",assignedAdviserId:7,riskDetails:null,quotes:[{id:9,status:"DRAFT",companyName:"APA Insurance"}],payments:[]}],totalElements:1,totalPages:1,number:0,size:100})}));
 await page.route("**/insurance/admin/staff",r=>r.fulfill({json:envelope([{id:7,fullName:"Amina Adviser",email:"amina@example.com",roleName:"INSURANCE_ADVISER"}])}));
 await page.route("**/insurance/admin/claims**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/admin/renewals**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([{id:1,code:"APA",name:"APA Insurance",active:true}])}));
 await page.route("**/insurance/admin/cases/1/request-quote",async r=>{dispatched=true;expect(r.request().postDataJSON()).toEqual({companyCode:"APA"});return r.fulfill({json:envelope({status:"QUEUED"})})});
 await page.route("**/insurance/admin/cases/INS-2026-TEST/email-history",r=>r.fulfill({json:envelope([{id:3,companyCode:"APA",companyName:"APA Insurance",caseReference:"INS-2026-TEST",correlationId:"test",messageType:"QUOTATION_REQUEST",direction:"INBOUND",status:"RECEIVED_VERIFIED",senderAddress:"quotes@apa.test",recipientAddress:"info@silverwoodinsurance.com",subject:"Re: quotation",receivedAt:"2026-09-13T10:00:00"}])}));
 await page.goto("/dashboard/insurance/operations");
 await expect(page.getByRole("button",{name:"Add quote"})).toBeVisible();
 await page.getByRole("button",{name:"Send to insurer"}).click();await page.getByRole("button",{name:"Send secure request"}).click();await expect.poll(()=>dispatched).toBe(true);
 await page.getByRole("button",{name:"Correspondence"}).click();const correspondenceDialog=page.getByRole("dialog");await expect(correspondenceDialog.getByText("Received Verified")).toBeVisible();
 await expect(page.getByRole("button",{name:/Approve APA/})).toHaveCount(0);
 expect(summaryRequests).toBe(0);
});

test("ordinary customer cannot open or query Silverwood operations",async({context,page})=>{
 let adminRequests=0;
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/admin/**",route=>{adminRequests+=1;return route.fulfill({status:403,json:envelope(null)})});
 await page.goto("/dashboard/insurance/operations");
 // Registered navigation permissions now reject this route at the proxy boundary.
 await expect(page).toHaveURL(/\/dashboard$/);
 expect(adminRequests).toBe(0);
});

test("insurance manager maintains partner branding and verified payment routes",async({context,page})=>{
 let partnerPayload:Record<string,unknown>|undefined,paymentPayload:Record<string,unknown>|undefined,deactivated=false;
 await authenticated(context,page,{title:"InsuranceManager",permissions:["manage_insurance_catalog","manage_insurance_payment_config"]});
 const partner={id:1,code:"APA",name:"APA Insurance",active:true,logoUrl:"/insurance/brands/apa.webp",description:"Approved partner",quotationEmail:"quotes@apa.test"};
 await page.route("**/insurance/admin/companies",async route=>{
  if(route.request().method()==="POST"){partnerPayload=route.request().postDataJSON();return route.fulfill({json:envelope({...partner,...partnerPayload,id:2})})}
  return route.fulfill({json:envelope([partner])});
 });
 await page.route("**/account/list**",route=>route.fulfill({json:envelope([{id:17,name:"APA Premium Collection",category:"INSURANCE",channel:"MPESA",active:true,verified:true},{id:18,name:"Unverified",category:"INSURANCE",channel:"BANK",active:true,verified:false}])}));
 await page.route("**/insurance/admin/companies/APA/payment-configurations",async route=>{
  if(route.request().method()==="POST"){paymentPayload=route.request().postDataJSON();return route.fulfill({json:envelope({id:5,...paymentPayload,companyCode:"APA",companyName:"APA Insurance",accountName:"APA Premium Collection",channel:"MPESA",version:1,active:true,accountVerified:true,paymentDetails:[]})})}
  return route.fulfill({json:envelope([{id:5,companyCode:"APA",companyName:"APA Insurance",paymentAccountId:17,accountName:"APA Premium Collection",channel:"MPESA",label:"Existing APA route",instructions:"Use the application reference.",version:1,effectiveFrom:"2026-09-01",active:true,accountVerified:true,paymentDetails:[]}])});
 });
 await page.route("**/insurance/admin/payment-configurations/5",route=>{deactivated=true;return route.fulfill({json:envelope(null)})});
 await page.goto("/dashboard/insurance/operations");
 await page.getByRole("tab",{name:"Partners"}).click();
 await expect(page.getByRole("img",{name:"APA Insurance logo"})).toBeVisible();
 await page.getByRole("button",{name:/APA Insurance/}).click();
 await expect(page.getByRole("heading",{name:"Edit insurance partner"})).toBeVisible();
 await page.getByRole("button",{name:"Cancel"}).click();
 await page.getByRole("tab",{name:"Payment routes"}).click();
 await page.getByRole("button",{name:"Deactivate"}).click();
 await expect(page.getByRole("heading",{name:"Deactivate this payment route?"})).toBeVisible();
 await page.getByRole("button",{name:"Cancel"}).click();
 expect(deactivated).toBe(false);
 await page.getByLabel("Verified Insurance account").click();
 await expect(page.getByRole("option",{name:/APA Premium Collection/})).toBeVisible();
 await expect(page.getByRole("option",{name:/Unverified/})).toHaveCount(0);
 await page.getByRole("option",{name:/APA Premium Collection/}).click();
 await page.getByLabel("Customer label").fill("Pay APA premium");
 await page.getByLabel("Payment instructions").fill("Use the application reference shown in SlickHood.");
 await page.getByRole("button",{name:"Activate route"}).click();
 await expect.poll(()=>paymentPayload?.paymentAccountId).toBe(17);
 expect(partnerPayload).toBeUndefined();
});

test("insurance journey runs from customer quote selection through policy issue and claim acknowledgement",async({context,page})=>{
 test.setTimeout(60_000);
 let status="QUOTED",paymentStatus="",proofAvailable=false,policyIssued=false,claimStatus="";
 const quote={id:9,companyId:1,companyCode:"APA",companyName:"APA Insurance",quoteNumber:"APA-Q-9",status:"PUBLISHED",currency:"KES",basePremium:23000,taxesLevies:2000,totalPremium:25000,coverageSummary:"Comprehensive cover",validUntil:"2026-12-01"};
 const insuranceCase=()=>({id:44,reference:"INS-2026-E2E",productCode:"MOTOR",status,fullName:"Amina Kamau",phone:"0712345678",email:"amina@example.com",subjectType:"VEHICLE",subjectDescription:"Toyota Fielder",sumInsured:1500000,currency:"KES",submittedAt:"2026-08-01T10:00:00",selectedQuoteId:status==="QUOTED"?undefined:9,quotes:[{...quote,status:status==="QUOTED"?"PUBLISHED":"SELECTED"}],payments:paymentStatus?[{id:20,quoteId:9,amount:25000,currency:"KES",paymentReference:"BANK-881",paidAt:"2026-08-02T10:00:00",status:paymentStatus,proofAvailable}]:[]});
 const policy=()=>({id:31,caseId:44,policyNumber:"APA-POL-31",companyName:"APA Insurance",productCode:"MOTOR",status:"ACTIVE",startDate:"2026-09-01",endDate:"2027-08-31",renewalStatus:"UPCOMING"});
 const claim=()=>({id:41,policyId:31,policyNumber:"APA-POL-31",reference:"CLM-2026-41",status:claimStatus||"SUBMITTED",incidentAt:"2026-08-20T10:00:00",description:"Windscreen damage"});
 await authenticated(context,page,{title:"InsuranceManager",permissions:["review_insurance_applications","manage_insurance_quotes","approve_insurance_quotes","verify_insurance_payments","issue_insurance_policies","manage_insurance_claims","manage_insurance_renewals"]});
 await page.route("**/insurance/agency",route=>route.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",route=>route.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",route=>route.fulfill({json:envelope([{id:1,code:"APA",name:"APA Insurance",active:true,logoUrl:"/insurance/brands/apa.webp"}])}));
 await page.route("**/insurance/cases",route=>route.fulfill({json:envelope([insuranceCase()])}));
 await page.route("**/insurance/cases/44/select-quote",route=>{status="CUSTOMER_SELECTED";return route.fulfill({json:envelope(insuranceCase())})});
 await page.route("**/insurance/cases/44/payments",route=>{status="PAYMENT_PENDING";paymentStatus="PENDING_VERIFICATION";return route.fulfill({json:envelope(insuranceCase().payments[0])})});
 await page.route("**/insurance/companies/APA/payment-options",route=>route.fulfill({json:envelope([{id:7,companyCode:"APA",companyName:"APA Insurance",accountName:"APA Premium Collection",channel:"MPESA",label:"Pay APA premium",instructions:"Use your application reference when paying.",referenceTemplate:"INS-YYYY-XXXX",paymentDetails:[{key:"paybill",label:"Paybill",description:"",value:"123456",displayField:true}]}])}));
 await page.route("**/insurance/payments/20/proof",route=>{if(route.request().method()==="GET")return route.fulfill({json:envelope("https://files.example/evidence?expires=60")});proofAvailable=true;return route.fulfill({json:envelope(insuranceCase().payments[0])})});
 await page.route("**/insurance/policies",route=>route.fulfill({json:envelope(policyIssued?[policy()]:[])}));
 await page.route("**/insurance/claims",route=>{if(route.request().method()==="POST"){claimStatus="SUBMITTED";return route.fulfill({json:envelope(claim())})}return route.fulfill({json:envelope(claimStatus?[claim()]:[])})});
 await page.route("**/insurance/documents",route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/admin/cases**",route=>route.fulfill({json:envelope({content:[insuranceCase()],totalElements:1,totalPages:1,number:0,size:100})}));
 await page.route("**/insurance/admin/staff",route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/admin/payments/20/decision",route=>{paymentStatus="VERIFIED";status="PAYMENT_VERIFIED";return route.fulfill({json:envelope(insuranceCase().payments[0])})});
 await page.route("**/insurance/admin/payments/20/remit",route=>{paymentStatus="REMITTED";status="PREMIUM_REMITTED";return route.fulfill({json:envelope(insuranceCase().payments[0])})});
 await page.route("**/insurance/admin/cases/44/policy",route=>{policyIssued=true;status="POLICY_ISSUED";return route.fulfill({json:envelope(policy())})});
 await page.route("**/insurance/admin/claims**",route=>route.fulfill({json:envelope({content:claimStatus?[claim()]:[],totalElements:claimStatus?1:0,totalPages:claimStatus?1:0,number:0,size:100})}));
 await page.route("**/insurance/admin/claims/41/status",route=>{claimStatus="ACKNOWLEDGED";return route.fulfill({json:envelope(claim())})});
 await page.route("**/insurance/admin/renewals**",route=>route.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));

 await page.goto("/dashboard/insurance");
 await page.getByRole("tab",{name:/Quotes/}).click();
 await page.getByRole("button",{name:"Choose this quote"}).click();
 await page.getByRole("tab",{name:/Applications/}).click();
 await page.getByRole("button",{name:"Record payment"}).click();
 await page.getByLabel("Insurer or bank reference").fill("BANK-881");
 await page.getByRole("button",{name:"Save payment"}).click();
 await page.getByText("Upload payment proof").locator("..").locator('input[type="file"]').setInputFiles({name:"proof.png",mimeType:"image/png",buffer:Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])});
 await expect.poll(()=>proofAvailable).toBe(true);

 await page.goto("/dashboard/insurance/operations");
 await page.getByRole("button",{name:"Review evidence"}).click();
 await expect(page.getByRole("link",{name:"Open secure evidence"})).toHaveAttribute("href",/files\.example\/evidence/);
 await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).first().click();
 await page.getByRole("button",{name:"Verify payment"}).click();
 await page.getByRole("button",{name:"Confirm"}).click();
 await page.getByRole("button",{name:"Record remittance"}).click();
 await page.getByLabel("Insurer remittance reference").fill("APA-REM-20");
 await page.getByRole("button",{name:"Confirm"}).click();
 await page.getByRole("button",{name:"Issue policy"}).click();
 await page.getByLabel("Policy number").fill("APA-POL-31");
 await page.getByLabel("Cover starts").fill("2026-09-01");
 await page.getByLabel("Cover ends").fill("2027-08-31");
 await page.getByRole("button",{name:"Confirm"}).click();
 await expect.poll(()=>policyIssued).toBe(true);

 await page.goto("/dashboard/insurance");
 await page.getByRole("tab",{name:/Policies/}).click();
 await page.getByRole("button",{name:"Start a claim"}).click();
 await page.getByLabel("Policy").click();await page.getByRole("option",{name:/APA-POL-31/}).click();
 await page.getByLabel("Incident date and time").fill("2026-08-20T10:00");
 await page.getByLabel("What happened?").fill("Windscreen damage");
 await page.getByRole("button",{name:"Submit claim"}).click();
 await page.goto("/dashboard/insurance/operations");
 await page.getByRole("tab",{name:"Claims"}).click();
 await page.getByRole("button",{name:"Update status"}).click();
 await page.getByRole("button",{name:"Confirm"}).click();
 await expect.poll(()=>claimStatus).toBe("ACKNOWLEDGED");
});
