import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

const product={code:"MOTOR",name:"Motor Insurance",description:"Private vehicle protection.",subjectTypes:["VEHICLE"]};

test("customer can submit a minimal Silverwood quote request",async({context,page})=>{
 await authenticated(context,page,{title:"Homeowner",permissions:[]});
 await page.route("**/insurance/products",r=>r.fulfill({json:envelope([product])}));
 await page.route("**/insurance/companies",r=>r.fulfill({json:envelope([{id:1,code:"APA",name:"APA Insurance"}])}));
 for(const endpoint of ["cases","policies","claims","documents"])await page.route(`**/insurance/${endpoint}`,async r=>r.request().method()==="POST"?r.fulfill({json:envelope({id:1,reference:"INS-2026-TEST",status:"SUBMITTED"})}):r.fulfill({json:envelope([])}));
 await page.goto("/dashboard/insurance");
 await expect(page.getByRole("heading",{name:"Insurance protection, made clear and connected."})).toBeVisible();
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
