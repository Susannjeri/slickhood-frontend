import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

test("system owner approves a pending Soko shop through an auditable decision",async({context,page})=>{
 await authenticated(context,page,{title:"Super Admin",permissions:[]});let decision:unknown;
 await page.route("**/soko/admin/summary",route=>route.fulfill({json:envelope({stores:1,pendingStores:1,publishedStores:0,products:0,publishedProducts:0,orders:0,activeOrders:0})}));
 await page.route("**/soko/admin/stores**",route=>route.fulfill({json:envelope([{id:41,ownerUserId:7,name:"Fresh Corner",address:"Nairobi",status:"PENDING_REVIEW",pickupEnabled:true,deliveryEnabled:true,currency:"KES",serviceRadiusKm:20,deliveryFee:100}])}));
 await page.route("**/soko/admin/products**",route=>route.fulfill({json:envelope([])}));
 await page.route("**/soko/admin/stores/41/moderation",route=>{decision=route.request().postDataJSON();return route.fulfill({json:envelope({})})});
 await page.goto("/dashboard/soko-management");await expect(page.getByText("Fresh Corner")).toBeVisible();await page.getByRole("button",{name:"Approve"}).click();await page.getByRole("button",{name:"Confirm decision"}).click();await expect.poll(()=>decision).toMatchObject({decision:"APPROVE"});
});

test("wealth administration exposes aggregate health and catalogue, never private portfolios",async({context,page})=>{
 await authenticated(context,page,{title:"Super Admin",permissions:[]});
 await page.route("**/wealth/admin/summary",route=>route.fulfill({json:envelope({activeAssets:23,owners:8,vaultDocuments:14,marketPricedAssets:4,activeAssetTypes:13})}));
 await page.route("**/wealth/admin/asset-types",route=>route.fulfill({json:envelope([{id:1,code:"PROPERTY",label:"Property",description:"Residential or commercial property",displayOrder:10,marketPricingAllowed:false,active:true}])}));
 await page.goto("/dashboard/wealth-management");await expect(page.getByRole("heading",{name:"Wealth administration"})).toBeVisible();await expect(page.getByText("23")).toBeVisible();await expect(page.getByText("Property",{exact:true})).toBeVisible();await expect(page.getByText(/will|trust|portfolio value/i)).toHaveCount(0);
});
