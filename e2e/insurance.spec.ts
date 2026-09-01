import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

const product={code:"MOTOR",name:"Motor Insurance",description:"Private vehicle protection.",subjectTypes:["VEHICLE"]};

test("customer can submit a minimal Silverwood quote request",async({context,page})=>{
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",r=>r.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([{id:1,code:"APA",name:"APA Insurance",active:true,logoUrl:"/insurance/brands/apa.webp"}])}));
 for(const endpoint of ["cases","policies","claims","documents"])await page.route(`**/insurance/${endpoint}`,async r=>r.request().method()==="POST"?r.fulfill({json:envelope({id:1,reference:"INS-2026-TEST",status:"SUBMITTED"})}):r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance");
 await expect(page.getByRole("heading",{name:"Insurance protection, made clear and connected."})).toBeVisible();
 await expect(page.getByRole("img",{name:"Silverwood Insurance Agency logo"})).toBeVisible();
 await expect(page.getByRole("img",{name:"APA Insurance logo"})).toBeVisible();
 await page.getByRole("button",{name:/Request a quote/}).first().click();
 const dialog=page.getByRole("dialog");await expect(dialog.getByRole("heading",{name:"Request Motor Insurance"})).toBeVisible();
 const inputs=dialog.locator("input");await inputs.nth(0).fill("Amina Kamau");await inputs.nth(1).fill("0712345678");await inputs.nth(2).fill("amina@example.com");await inputs.nth(3).fill("1500000");
 await dialog.locator("textarea").first().fill("2019 Toyota Fielder, private use");await dialog.locator('input[type="checkbox"]').check();await dialog.getByRole("button",{name:"Submit request"}).click();
 await expect(page.getByText("Quote request submitted to Silverwood.")).toBeVisible();
});

test("customer records payment and withdraws an eligible application with explicit dialogs",async({context,page})=>{
 let paymentPayload:Record<string,unknown>|undefined,withdrawn=false;
 const selected={id:44,reference:"INS-2026-PAY",productCode:"MOTOR",status:"CUSTOMER_SELECTED",fullName:"Amina Kamau",phone:"0712345678",email:"amina@example.com",subjectType:"VEHICLE",subjectDescription:"Toyota Fielder",sumInsured:1500000,currency:"KES",submittedAt:"2026-08-01T10:00:00",selectedQuoteId:9,quotes:[{id:9,status:"SELECTED",companyName:"APA Insurance",totalPremium:25000,currency:"KES",basePremium:23000,taxesLevies:2000,coverageSummary:"Comprehensive",validUntil:"2026-12-01"}],payments:[]};
 const draft={...selected,id:45,reference:"INS-2026-DRAFT",status:withdrawn?"WITHDRAWN":"SUBMITTED",selectedQuoteId:undefined,quotes:[]};
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency",logoUrl:"/insurance/brands/silverwood.webp"})}));
 await page.route("**/insurance/products",route=>route.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/cases",route=>route.fulfill({json:envelope([selected,{...draft,status:withdrawn?"WITHDRAWN":"SUBMITTED"}])}));
 for(const endpoint of ["policies","claims","documents"])await page.route(`**/insurance/${endpoint}`,route=>route.fulfill({json:envelope([])}));
 await page.route("**/insurance/cases/44/payments",async route=>{paymentPayload=route.request().postDataJSON();await route.fulfill({json:envelope({id:1,status:"PENDING_VERIFICATION"})})});
 await page.route("**/insurance/cases/45/withdraw",async route=>{withdrawn=true;await route.fulfill({json:envelope({...draft,status:"WITHDRAWN"})})});
 await page.goto("/dashboard/insurance");
 await page.getByRole("button",{name:"Record payment"}).click();
 const paymentDialog=page.getByRole("dialog");
 await expect(paymentDialog.getByRole("heading",{name:"Record insurer payment"})).toBeVisible();
 await paymentDialog.getByLabel("Insurer or bank reference").fill("BANK-REF-881");
 await paymentDialog.getByRole("button",{name:"Save payment"}).click();
 await expect.poll(()=>paymentPayload?.paymentReference).toBe("BANK-REF-881");
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
 let summaryRequests=0;
 await authenticated(context,page,{title:"InsuranceAdviser",permissions:["review_insurance_applications","manage_insurance_quotes","manage_insurance_claims","manage_insurance_renewals"]});
 await page.route("**/insurance/admin/operations/summary",r=>{summaryRequests+=1;return r.fulfill({status:403,json:envelope(null)})});
 await page.route("**/insurance/admin/cases**",r=>r.fulfill({json:envelope({content:[{id:1,reference:"INS-2026-TEST",productCode:"MOTOR",status:"QUOTED",fullName:"Amina Kamau",phone:"0712345678",email:"amina@example.com",subjectDescription:"Toyota Fielder",assignedAdviserId:7,riskDetails:null,quotes:[{id:9,status:"DRAFT",companyName:"APA Insurance"}],payments:[]}],totalElements:1,totalPages:1,number:0,size:100})}));
 await page.route("**/insurance/admin/staff",r=>r.fulfill({json:envelope([{id:7,fullName:"Amina Adviser",email:"amina@example.com",roleName:"INSURANCE_ADVISER"}])}));
 await page.route("**/insurance/admin/claims**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/admin/renewals**",r=>r.fulfill({json:envelope({content:[],totalElements:0,totalPages:0,number:0,size:100})}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance/operations");
 await expect(page.getByRole("button",{name:"Add quote"})).toBeVisible();
 await expect(page.getByRole("button",{name:/Approve APA/})).toHaveCount(0);
 expect(summaryRequests).toBe(0);
});

test("ordinary customer cannot open or query Silverwood operations",async({context,page})=>{
 let adminRequests=0;
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/admin/**",route=>{adminRequests+=1;return route.fulfill({status:403,json:envelope(null)})});
 await page.goto("/dashboard/insurance/operations");
 await expect(page.getByRole("heading",{name:"Silverwood staff access only"})).toBeVisible();
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
 await page.route("**/insurance/payments/20/proof",route=>{proofAvailable=true;return route.fulfill({json:envelope(insuranceCase().payments[0])})});
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
