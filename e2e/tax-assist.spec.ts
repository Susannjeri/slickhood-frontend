import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

const rule={id:1,ruleCode:"KENYA_MRI",version:1,effectiveFrom:"2024-01-01",rate:.075,lowerThreshold:288000,upperThreshold:15000000,currency:"KES",sourceUrl:"https://new.kenyalaw.org/",sourceNote:"Current rule",active:true};
const configuration={estimatesEnabled:true,connectionRequestsEnabled:false,liveKraTransmissionEnabled:false,legalNoticeVersion:"tax-guidance-2026-09"};

test("landlord can calculate MRI without transmitting data to a KRA connector",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions:[]});let connectionPosts=0;let estimateBody:Record<string,unknown>|undefined;
 await page.route("**/tax-assist/calculations**",route=>route.fulfill({json:envelope([])}));
 await page.route("**/tax-assist/configuration",route=>route.fulfill({json:envelope(configuration)}));
 await page.route("**/tax-assist/connections",async route=>{if(route.request().method()==="POST")connectionPosts+=1;return route.fulfill({json:envelope([])});});
 await page.route("**/tax-assist/estimate/mri",async route=>{estimateBody=await route.request().postDataJSON();return route.fulfill({json:envelope({id:19,calculationType:"MRI",taxPeriod:"2026-08",currency:"KES",grossAmount:100000,taxableAmount:100000,estimatedTax:7500,creditAmount:1000,estimatedPayable:6500,outcome:"MRI_ESTIMATE",explanation:"Estimated MRI is based on gross residential rent received.",dueDate:"2026-09-20",rule,createdOn:"2026-09-02T10:00:00+03:00"})});});
 await page.goto("/dashboard/tax-assist");
 await expect(page.getByRole("heading",{name:"Slickhood Tax Assist"})).toBeVisible();
 await page.getByLabel("Rental month").fill("2026-08");
 await page.getByLabel("Projected annual gross residential rent").fill("1200000");
 await page.getByLabel("Gross rent actually received this month").fill("100000");
 await page.getByLabel("Verified rental withholding credits").fill("1000");
 await page.getByRole("button",{name:"Calculate and save estimate"}).click();
 await expect(page.getByText("Your saved estimate",{exact:true})).toBeVisible();
 await expect(page.getByText("Ksh 6,500.00").first()).toBeVisible();
 expect(estimateBody).toMatchObject({grossRentReceived:100000,projectedAnnualGrossRent:1200000,withholdingCredits:1000});
 expect(connectionPosts).toBe(0);
});

test("tax administration is visible only in a superadmin session",async({context,page})=>{
 await authenticated(context,page,{title:"Superadmin",permissions:[]});
 await page.route("**/tax-assist/admin/rules",route=>route.fulfill({json:envelope([rule])}));
 await page.route("**/tax-assist/admin/connections**",route=>route.fulfill({json:envelope([])}));
 await page.route("**/tax-assist/configuration",route=>route.fulfill({json:envelope(configuration)}));
 await page.goto("/dashboard/tax-assist/admin");
 await expect(page.getByRole("heading",{name:"Tax administration",exact:true})).toBeVisible();
 await expect(page.getByText("KENYA_MRI · version 1")).toBeVisible();
 await expect(page.locator('[data-slot="card-title"]').filter({hasText:"KRA onboarding requests"})).toBeVisible();
 await expect(page.getByText("Live KRA transmission: disabled",{exact:true})).toBeVisible();
});

test("admin pause is reflected safely in the customer experience",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions:[]});
 await page.route("**/tax-assist/calculations**",route=>route.fulfill({json:envelope([])}));
 await page.route("**/tax-assist/connections",route=>route.fulfill({json:envelope([])}));
 await page.route("**/tax-assist/configuration",route=>route.fulfill({json:envelope({...configuration,estimatesEnabled:false})}));
 await page.goto("/dashboard/tax-assist");
 await expect(page.getByText("Tax estimates are temporarily paused",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Estimates temporarily paused"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Requests paused"})).toBeDisabled();
});
