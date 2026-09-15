import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const rider = { id: 7, storeId: 2, displayName: "Amina Rider", email: "amina@example.test", phoneNumber: "0700000000", riderType: "INDIVIDUAL", vehicleType: "MOTORBIKE", vehiclePlate: "KAA 001A", userId: 9, verified: true, status: "SUSPENDED", availability: "OFFLINE", verificationStatus: "VERIFIED" };
const checklist = { commonKycApproved: true, outstanding: ["Certificate of good conduct"], uploadTypes: ["GOOD_CONDUCT_CERTIFICATE"], documents: [], renewalDocumentTypes: ["GOOD_CONDUCT_CERTIFICATE"] };

test("merchant edits a pending rider without granting verification",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  let saved=false;
  await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([{id:2,name:"Fresh Corner",status:"PUBLISHED"}])}));
  await page.route("**/account/list**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/order/merchant**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/rider/my**",r=>r.fulfill({json:envelope([{...rider,verified:false,status:"PENDING_VERIFICATION",displayName:saved?"Amina Updated":"Amina Rider"}])}));
  await page.route("**/soko/rider/7",r=>{expect(r.request().postDataJSON()).toMatchObject({displayName:"Amina Updated",email:"amina@example.test",storeId:2});expect(r.request().postDataJSON().verified).toBeUndefined();saved=true;return r.fulfill({json:envelope([])});});
  await page.goto("/dashboard/soko");await page.getByRole("button",{name:"Merchant workspace"}).click();
  await page.getByRole("button",{name:"Edit rider",exact:true}).click();
  await page.getByPlaceholder("Rider or company name").fill("Amina Updated");
  await page.getByRole("button",{name:"Save rider changes",exact:true}).click();
  await expect(page.getByText("Amina Updated",{exact:true})).toBeVisible();
  expect(saved).toBe(true);await expect(page.getByRole("button",{name:"Verify and activate"})).toHaveCount(0);
});

test("merchant cannot edit or remove a rider on an active delivery",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([{id:2,name:"Fresh Corner",status:"PUBLISHED"}])}));
  await page.route("**/account/list**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/order/merchant**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/rider/my**",r=>r.fulfill({json:envelope([{...rider,status:"ACTIVE",availability:"BUSY"}])}));
  await page.goto("/dashboard/soko");await page.getByRole("button",{name:"Merchant workspace"}).click();
  await expect(page.getByRole("button",{name:"Edit rider",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Remove",exact:true})).toBeDisabled();
});

test("resumed service reuses approved KYC and persists referees before submission",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:["view_sp_profile","view_sp_service","view_sp_category_list","add_sp_referee","add_sp_service"]});
  let referees=0,submitted=false;
  const service={id:12,profileId:2,categoryId:4,categoryName:"Cleaning",amount:500,currency:"KES",pricingUnit:"PER_JOB",status:"DRAFT",riskLabel:"UNDER_REVIEW",createdOn:new Date().toISOString()};
  await page.route("**/sp/profile",r=>r.fulfill({json:envelope([{id:2,businessName:"Clean Team",status:"ACTIVE"}])}));
  await page.route("**/sp/category/list**",r=>r.fulfill({json:envelope([{id:4,name:"Cleaning",description:"Cleaning",requiredDocumentTypes:["GOOD_CONDUCT"],requiredNumberOfReferees:1}])}));
  await page.route("**/sp/service/list**",r=>r.fulfill({json:envelope([service])}));
  await page.route("**/sp/pricing/unit/list",r=>r.fulfill({json:envelope([])}));
  await page.route("**/sp/service/12/readiness",r=>r.fulfill({json:envelope([{uploadedDocumentTypes:["GOOD_CONDUCT"],verifiedDocumentTypes:["GOOD_CONDUCT"],outstandingDocumentTypes:[],refereeCount:referees,verifiedRefereeCount:0,requiredReferees:1}])}));
  await page.route("**/sp/referee/list**",r=>r.fulfill({json:envelope(referees?[{id:5,name:"Test Referee",contact:"referee@example.test",verificationStatus:"PENDING"}]:[])}));
  await page.route("**/sp/referee/add",r=>{expect(r.request().postDataJSON()).toEqual({name:"Test Referee",contact:"referee@example.test"});referees++;return r.fulfill({json:envelope([])});});
  await page.route("**/sp/service/12/submit",r=>{submitted=true;return r.fulfill({json:envelope([service])});});
  await page.goto("/dashboard/services");
  await page.getByRole("button",{name:"Resume →",exact:true}).click();
  await expect(page.getByText("Approved document reused — no upload needed")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  await page.getByRole("button",{name:"Continue",exact:false}).click();
  await page.getByLabel("Referee full name").fill("Test Referee");await page.getByLabel("Referee contact").fill("referee@example.test");
  await page.getByRole("button",{name:"Add referee",exact:true}).click();
  await expect(page.getByText("referee@example.test · pending")).toBeVisible();
  await page.getByRole("button",{name:"Continue",exact:false}).click();
  await page.getByRole("button",{name:"Submit for Review",exact:true}).click();
  await expect.poll(()=>submitted).toBe(true);expect(referees).toBe(1);
});

test("provider can pause a listed service and resume it",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:["view_sp_profile","view_sp_service","view_sp_category_list","edit_sp_service"]});
  let paused=false,resumed=false;
  await page.route("**/sp/profile",r=>r.fulfill({json:envelope([{id:2,status:"ACTIVE"}])}));
  await page.route("**/sp/category/list**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/sp/service/list**",r=>r.fulfill({json:envelope([{id:12,categoryId:4,categoryName:"Cleaning",amount:500,currency:"KES",pricingUnit:"PER_JOB",status:paused?"HIDDEN":"LISTED",riskLabel:"VERIFIED",createdOn:new Date().toISOString()}])}));
  await page.route("**/sp/service/12/pause",r=>{paused=true;return r.fulfill({json:envelope([])});});
  await page.route("**/sp/service/12/resume",r=>{paused=false;resumed=true;return r.fulfill({json:envelope([])});});
  await page.goto("/dashboard/services");await page.getByRole("button",{name:"Pause listing",exact:true}).click();
  await expect(page.getByRole("button",{name:"Resume listing",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Resume listing",exact:true}).click();
  await expect(page.getByRole("button",{name:"Pause listing",exact:true})).toBeVisible();expect(resumed).toBe(true);
});

test("admin can reactivate a suspended verified rider", async ({ context, page }) => {
  await authenticated(context,page,{title:"Superadmin",permissions:["list_users"]});
  let activated=false;
  await page.route("**/soko/admin/riders**",r=>r.fulfill({json:envelope([{...rider,status:activated?"ACTIVE":"SUSPENDED"}])}));
  await page.route("**/soko/admin/riders/7/decision",r=>{expect(r.request().postDataJSON().decision).toBe("ACTIVATE");activated=true;return r.fulfill({json:envelope([])});});
  await page.goto("/dashboard/rider-verification");
  await expect(page.getByText("SUSPENDED",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Reactivate rider"}).click();
  await expect(page.getByRole("button",{name:"Suspend",exact:true})).toBeVisible();
  expect(activated).toBe(true);
});

test("rider directory load failure is retryable and not a false empty result", async ({context,page})=>{
  await authenticated(context,page,{title:"Superadmin",permissions:["list_users"]});
  let requests=0;
  await page.route("**/soko/admin/riders**",r=>++requests===1?r.fulfill({status:503,json:{description:"Rider directory temporarily unavailable"}}):r.fulfill({json:envelope([rider])}));
  await page.goto("/dashboard/rider-verification");
  await expect(page.getByRole("alert").filter({hasText:"Rider directory"})).toContainText("temporarily unavailable");
  await expect(page.getByText("No riders match this search.")).toHaveCount(0);
  await page.getByRole("button",{name:"Retry",exact:true}).click();
  await expect(page.getByText("Amina Rider",{exact:true})).toBeVisible();
});

test("rider uploads only missing supplemental evidence without reopening common KYC", async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  let uploaded=false,commonWrites=0;
  await page.route("**/soko/rider/assignments**",r=>r.fulfill({json:envelope([])}));
  page.on("request",r=>{if(new URL(r.url()).pathname.includes("/kyc/")&&r.method()!=="GET")commonWrites++;});
  await page.route("**/soko/rider/kyc",async r=>{
    if(r.request().method()==="POST"){uploaded=true;expect(r.request().postData()).toContain("GOOD_CONDUCT_CERTIFICATE");return r.fulfill({json:envelope([])});}
    return r.fulfill({json:envelope([{...checklist,documents:uploaded?[{id:4,documentType:"GOOD_CONDUCT_CERTIFICATE",status:"PENDING_REVIEW"}]:[]}])});
  });
  await page.goto("/dashboard/soko-deliveries");
  await page.getByRole("button",{name:"Complete rider verification"}).click();
  await expect(page.getByText("Common account KYC approved — reused")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({name:"certificate.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-test-fixture")});
  await expect(page.getByText("pending review",{exact:true})).toBeVisible();
  expect(uploaded).toBe(true);expect(commonWrites).toBe(0);
});

test("admin reviews private rider evidence before activation",async({context,page})=>{
  await authenticated(context,page,{title:"Superadmin",permissions:["list_users"]});
  let approved=false;
  await page.route("**/soko/admin/riders**",r=>r.fulfill({json:envelope([{...rider,verified:false,status:"PENDING_VERIFICATION"}])}));
  await page.route("**/soko/admin/riders/7/kyc",r=>r.fulfill({json:envelope([{...checklist,documents:[{id:4,documentType:"GOOD_CONDUCT_CERTIFICATE",status:approved?"VERIFIED":"PENDING_REVIEW",downloadUrl:"https://storage.example.test/private-certificate"}]}])}));
  await page.route("**/soko/admin/rider-kyc/4/review",r=>{expect(r.request().postDataJSON()).toMatchObject({decision:"VERIFY",notes:"Issuer and holder verified"});approved=true;return r.fulfill({json:envelope([])});});
  await page.goto("/dashboard/rider-verification");
  await page.getByRole("button",{name:"Review KYC"}).click();
  await expect(page.getByRole("link",{name:"View private document"})).toHaveAttribute("href","https://storage.example.test/private-certificate");
  await page.getByLabel("Review notes 4").fill("Issuer and holder verified");
  await page.getByRole("button",{name:"Approve evidence"}).click();
  await expect(page.getByText("verified",{exact:true})).toBeVisible();expect(approved).toBe(true);
  await expect(page.getByRole("button",{name:"Verify and activate"})).toBeVisible();
});

test("failed image upload retries the saved product instead of creating duplicates",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  let creates=0,updates=0,uploads=0;
  const product={id:5,storeId:2,name:"Milk",category:"Groceries",unit:"item",price:100,stockQuantity:3,currency:"KES",status:"DRAFT"};
  await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([{id:2,name:"Fresh Corner",status:"PUBLISHED",currency:"KES"}])}));
  await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/product",r=>{creates++;return r.fulfill({json:envelope([product])});});
  await page.route("**/soko/product/5",r=>{updates++;return r.fulfill({json:envelope([product])});});
  await page.route("**/soko/product/5/images",r=>++uploads===1?r.fulfill({status:503,json:{description:"Image upload unavailable"}}):r.fulfill({json:envelope([])}));
  await page.goto("/dashboard/soko-inventory");
  await page.getByPlaceholder("Product name",{exact:true}).fill("Milk");
  await page.getByLabel("Base price",{exact:false}).fill("100");
  await page.getByLabel("Stock quantity",{exact:true}).fill("3");
  await page.getByLabel("Add product images").setInputFiles({name:"milk.png",mimeType:"image/png",buffer:Buffer.from("test-image")});
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>uploads).toBe(1);
  await expect(page.getByRole("button",{name:"Save changes",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.getByRole("button",{name:"Save draft",exact:true})).toBeVisible();
  expect(creates).toBe(1);expect(updates).toBe(1);expect(uploads).toBe(2);
});
