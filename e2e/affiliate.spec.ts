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

test("system owner records payout decisions through an auditable dialog",async({context,page})=>{
 await authenticated(context,page,{title:"Super Admin",permissions:[]});
 let decision:unknown;
 await page.route("**/affiliate/admin/payouts",route=>route.fulfill({json:envelope([{id:51,payoutNumber:"AFP-51",affiliateUserId:7,amount:2200,currency:"KES",status:"PROCESSING",requestedAt:"2026-08-01T00:00:00Z",payoutAccountName:"Affiliate M-Pesa",payoutChannel:"MPESA"}])}));
 await page.route("**/affiliate/admin/payouts/51",route=>{decision=route.request().postDataJSON();return route.fulfill({json:envelope({})});});
 await page.goto("/dashboard/affiliate-management");
 await expect(page.getByText("Affiliate M-Pesa")).toBeVisible();
 await page.getByRole("button",{name:"Mark paid"}).click();
 await page.getByLabel("Payment reference").fill("MPESA-SETTLED-51");
 await page.getByRole("button",{name:"Confirm paid"}).click();
 await expect.poll(()=>decision).toMatchObject({status:"PAID",paymentReference:"MPESA-SETTLED-51"});
});
