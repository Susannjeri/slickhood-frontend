import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

test("referral attribution is validated and timestamped before registration",async({page})=>{
 await page.route("**/affiliate/public/SH-1234567890ABCDEF",route=>route.fulfill({json:envelope({valid:true})}));
 await page.goto("/r/SH-1234567890ABCDEF?campaign=whatsapp");
 await page.waitForURL("**/role");
 const attribution=await page.evaluate(()=>({code:localStorage.getItem("slickhood_referral_code"),campaign:localStorage.getItem("slickhood_referral_campaign"),captured:Number(localStorage.getItem("slickhood_referral_captured_at"))}));
 expect(attribution.code).toBe("SH-1234567890ABCDEF");
 expect(attribution.campaign).toBe("whatsapp");
 expect(attribution.captured).toBeGreaterThan(Date.now()-60_000);
});

test("affiliate sees a safe ledger and confirms a reserved payout",async({context,page})=>{
 await authenticated(context,page,{title:"Affiliate",permissions:["view_account","view_invite_list"]});
 let payoutRequests=0;
 await page.route("**/affiliate/history/**",route=>route.fulfill({json:{...envelope([]),totalPages:0,totalElements:0,size:20}}));
 await page.route("**/affiliate/balances",route=>route.fulfill({json:envelope([{currency:"KES",available:1600,pending:200,lifetime:1800,pendingPayouts:0,payoutSupported:true}])}));
 await page.route("**/account/list**",route=>route.fulfill({json:envelope([{id:12,name:"Affiliate M-Pesa",channel:"MPESA",verified:true,active:true}])}));
 await page.route("**/affiliate/dashboard",route=>route.fulfill({json:envelope({profile:{referralCode:"SH-1234567890ABCDEF",status:"ACTIVE",commissionRate:10,minimumPayout:1000,currency:"KES",payoutAccountId:12},totalReferrals:2,conversions:1,conversionRatePercent:50,availableBalance:1600,pendingEarnings:200,lifetimeEarnings:1800,pendingPayouts:0,historyLimited:false,referrals:[{id:21,status:"CONVERTED",campaign:"whatsapp",registeredAt:"2026-08-01T00:00:00Z",convertedAt:"2026-08-02T00:00:00Z"}],commissions:[{id:31,invoiceRef:"INV-31",qualifyingAmount:16000,commissionRate:10,commissionAmount:1600,currency:"KES",status:"EARNED",earnedAt:"2026-08-02T00:00:00Z"}],payouts:[]})}));
 await page.route("**/affiliate/payout",route=>{payoutRequests+=1;return route.fulfill({json:envelope({id:41,payoutNumber:"AFP-123",amount:1600,currency:"KES",status:"REQUESTED"})});});
 await page.goto("/dashboard/affiliate");
 await expect(page.getByRole("heading",{name:"Refer people. Grow SlickHood. Earn."})).toBeVisible();
 await expect(page.getByText("50%")).toBeVisible();
 await expect(page.getByText("Referral #21")).toBeVisible();
 await page.getByRole("button",{name:"Request payout"}).click();
 await expect(page.getByRole("heading",{name:"Request affiliate payout?"})).toBeVisible();
 expect(payoutRequests).toBe(0);
 await page.getByRole("button",{name:"Confirm payout request"}).click();
 await expect.poll(()=>payoutRequests).toBe(1);
});

test("new affiliate sees approval status without subscription or financial controls",async({context,page})=>{
 await authenticated(context,page,{title:"Affiliate",permissions:["view_account","view_invite_list"]});
 let accountListRequests=0;
 await page.route("**/account/list**",route=>{accountListRequests+=1;return route.fulfill({json:envelope([])});});
 await page.route("**/affiliate/dashboard",route=>route.fulfill({json:envelope({profile:{referralCode:"SH-PENDING12345678",status:"PENDING_APPROVAL",commissionRate:10,minimumPayout:1000,currency:"KES",appliedAt:"2026-09-16T08:00:00Z"},totalReferrals:0,conversions:0,conversionRatePercent:0,availableBalance:0,pendingEarnings:0,lifetimeEarnings:0,pendingPayouts:0,historyLimited:false,referrals:[],commissions:[],payouts:[]})}));
 await page.goto("/dashboard/affiliate");
 await expect(page.getByText("Your affiliate application is under review",{exact:true})).toBeVisible();
 await expect(page.getByText(/does not require a subscription/i)).toBeVisible();
 await expect(page.getByRole("button",{name:"Request payout"})).toHaveCount(0);
 await expect(page.getByText("SH-PENDING12345678")).toHaveCount(0);
 expect(accountListRequests).toBe(0);
});

test("system owner records payout decisions through an auditable dialog",async({context,page})=>{
 await authenticated(context,page,{title:"Super Admin",permissions:[]});
 let decision:unknown;
 await page.route("**/affiliate/admin/policy",route=>route.fulfill({json:envelope([{commissionRate:25,eligiblePaymentCount:3,minimumPayout:1000,holdDays:14,version:2}])}));
 await page.route("**/affiliate/admin/profiles?**",route=>route.fulfill({json:{...envelope([null,"legacy",{userId:99,profile:null}]),totalPages:"invalid",totalElements:"invalid",size:20}}));
 await page.route("**/affiliate/admin/payout-queue?**",route=>route.fulfill({json:{...envelope([null,"legacy",{payout:{id:51,payoutNumber:"AFP-51",affiliateUserId:7,paymentAccountId:12,amount:2200,currency:"KES",status:"PROCESSING",requestedAt:"2026-08-01T00:00:00Z",payoutAccountName:"Affiliate M-Pesa",payoutChannel:"MPESA",version:4},affiliateName:"Fixture Affiliate",affiliateEmail:"affiliate@example.test"},{id:52,payoutNumber:"AFP-52",affiliateUserId:8,amount:500,currency:{legacy:true},status:"PAID",requestedAt:"2026-08-01T00:00:00Z",version:1}]),totalPages:"1",totalElements:"2",size:20}}));
 await page.route("**/affiliate/admin/payouts/51",route=>{decision=route.request().postDataJSON();return route.fulfill({json:envelope({})});});
 await page.goto("/dashboard/affiliate-management");
 await expect(page.getByText("25",{exact:true})).toBeVisible();
 await expect(page.getByText("Affiliate M-Pesa")).toBeVisible();
 await page.getByRole("button",{name:"Mark paid"}).click();
 await page.getByLabel("Payment reference").fill("MPESA-SETTLED-51");
 await page.getByRole("button",{name:"Confirm paid"}).click();
 await expect.poll(()=>decision).toMatchObject({status:"PAID",paymentReference:"MPESA-SETTLED-51",expectedAmount:2200,expectedCurrency:"KES",expectedVersion:4});
});
