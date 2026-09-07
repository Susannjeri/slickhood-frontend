import {expect,test,Page} from "@playwright/test";
import {authenticated,envelope} from "./support";

const permissions=["view_wealth","manage_wealth_assets","manage_wealth_finance","manage_wealth_compliance","manage_wealth_goals","manage_wealth_vault"];
const types=[{id:1,code:"CASH",label:"Cash & savings",description:"Bank savings and emergency funds",marketPricingAllowed:false,active:true},{id:2,code:"GOVERNMENT_SECURITY",label:"Government securities",description:"Treasury bills and bonds",marketPricingAllowed:false,active:true},{id:3,code:"LISTED_SECURITY",label:"Listed shares",marketPricingAllowed:true,active:true}];
const baseAsset={id:11,assetType:"CASH",name:"Emergency savings",currency:"KES",acquisitionCost:90000,currentValue:100000,valuationDate:"2026-01-01",status:"ACTIVE",pricingMode:"MANUAL"};
async function setup(page:Page,assets:object[]=[]){
 await page.route("**/wealth/dashboard**",r=>r.fulfill({json:envelope({summary:{currency:"KES",netWorth:90000,totalAssetValue:100000,totalDebt:10000,cashFlow:-12000},assets:[],obligations:[],goals:[],goalProgress:[],insights:[],projection:[]})}));
 await page.route("**/wealth/assets",r=>r.fulfill({json:envelope(assets)}));
 await page.route("**/wealth/asset-types",r=>r.fulfill({json:envelope(types)}));
 await page.route("**/wealth/property-options",r=>r.fulfill({json:envelope([])}));
 await page.route("**/wealth/vault",r=>r.fulfill({json:envelope([])}));
}
test("add wealth preserves category codes and failed form, then creates and edits successfully",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);
 let fail=true;let saved:Record<string,unknown>|undefined;let edited:unknown;let assets:object[]=[];
 await page.route("**/wealth/assets",route=>{if(route.request().method()==="POST"){saved=route.request().postDataJSON();if(fail)return route.fulfill({status:503,json:{description:"Please retry saving"}});assets=[{...saved,id:11}];return route.fulfill({json:envelope(assets[0])});}return route.fulfill({json:envelope(assets)});});
 await page.route("**/wealth/assets/11",route=>{edited=route.request().postDataJSON();return route.fulfill({json:envelope(edited)});});
 await page.goto("/dashboard/wealth");await page.getByRole("button",{name:"Add your first asset"}).click();
 await page.getByLabel("Name",{exact:true}).fill("Treasury savings");await page.getByLabel("Type",{exact:true}).selectOption("GOVERNMENT_SECURITY");
 await expect(page.getByLabel("Pricing").locator("option[value=MARKET]")).toHaveCount(0);
 await page.getByLabel("Current value",{exact:true}).fill("150000.50");await page.getByRole("button",{name:"Add asset",exact:true}).click();
 await expect(page.getByText("Please retry saving")).toBeVisible();await expect(page.getByLabel("Name",{exact:true})).toHaveValue("Treasury savings");expect(saved?.assetType).toBe("GOVERNMENT_SECURITY");
 fail=false;await page.getByRole("button",{name:"Add asset",exact:true}).click();await expect(page.getByText("Treasury savings",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Edit",exact:true}).click();await expect(page.getByLabel("Currency",{exact:true})).toBeDisabled();await page.getByLabel("Name",{exact:true}).fill("Treasury reserve");await page.getByRole("button",{name:"Save asset",exact:true}).click();await expect.poll(()=>edited).toMatchObject({name:"Treasury reserve",assetType:"GOVERNMENT_SECURITY"});
});
test("income and debt history is visible and repayments update the existing debt",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page,[baseAsset]);let update:unknown;
 await page.route("**/wealth/assets/11/ledger",r=>r.fulfill({json:envelope({valuations:[{id:1,amount:100000,valuationDate:"2026-01-01",source:"STATEMENT"}],cashFlows:[{id:2,flowType:"INCOME",category:"INTEREST",amount:500,entryDate:"2026-01-01"}],liabilities:[{id:3,lender:"Test Bank",currency:"KES",originalPrincipal:20000,outstandingPrincipal:10000,monthlyPayment:1000,maturityDate:"2027-01-01"}],obligations:[],documents:[]})}));
 await page.route("**/wealth/liabilities/3/balance",r=>{update=r.request().postDataJSON();return r.fulfill({json:envelope({})});});
 await page.goto("/dashboard/wealth");await page.getByRole("tab",{name:"Income & debt"}).click();
 await expect(page.getByText("Valuation history",{exact:true})).toBeVisible();await expect(page.getByText("INTEREST · 2026-01-01")).toBeVisible();
 await page.screenshot({path:"D:/SlickHood-Codex/operations/wealth-finance-preview-20260907.png",fullPage:true});
 await page.getByLabel("Outstanding balance for Test Bank").fill("8000");await page.getByRole("button",{name:"Update balance",exact:true}).click();await expect.poll(()=>update).toEqual({outstandingPrincipal:8000,monthlyPayment:1000,maturityDate:"2027-01-01"});
});
test("vault submits encoded document category and shows server failures without discarding file",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);let body="";
 await page.route("**/wealth/vault",route=>{if(route.request().method()==="POST"){body=route.request().postData()??"";return route.fulfill({status:503,json:{description:"Scanning temporarily unavailable"}});}return route.fulfill({json:envelope([])});});
 await page.goto("/dashboard/wealth");await page.getByRole("tab",{name:"Document vault"}).click();await page.getByLabel("Document category").selectOption("TRUST_DEED");await page.getByLabel("File",{exact:true}).setInputFiles({name:"test.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-test-only")});await page.getByRole("button",{name:"Upload securely"}).click();await expect(page.getByText("Scanning temporarily unavailable")).toBeVisible();expect(body).toContain("TRUST_DEED");expect(body).not.toContain("TRUST DEED");await expect(page.getByRole("button",{name:"Upload securely"})).toBeEnabled();
});
test("failed totals are not presented as zero wealth and mobile navigation works",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page,[baseAsset]);await page.route("**/wealth/dashboard**",r=>r.fulfill({status:503,json:{}}));await page.setViewportSize({width:390,height:844});await page.goto("/dashboard/wealth");await expect(page.getByRole("alert").filter({hasText:"Wealth totals could not"})).toBeVisible();await expect(page.getByText("Net worth",{exact:true})).toHaveCount(0);await page.getByRole("tab",{name:"Assets",exact:true}).click();await expect(page.getByText("Emergency savings",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Try again",exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test("read-only wealth user cannot submit asset changes",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions:["view_wealth"]});await setup(page,[baseAsset]);await page.goto("/dashboard/wealth");await page.getByRole("tab",{name:"Assets",exact:true}).click();await expect(page.getByRole("button",{name:"Add asset",exact:true})).toBeDisabled();await expect(page.getByRole("button",{name:"Edit",exact:true})).toBeDisabled();
});
test("debt-free goals and expiry-only deadlines submit valid data",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page,[baseAsset]);let goal:unknown;let deadline:Record<string,unknown>|undefined;
 await page.route("**/wealth/goals",r=>{goal=r.request().postDataJSON();return r.fulfill({json:envelope({})});});
 await page.route("**/wealth/assets/11/obligations",r=>{deadline=r.request().postDataJSON();return r.fulfill({json:envelope({})});});
 await page.goto("/dashboard/wealth");await page.getByRole("tab",{name:"Goals & projections"}).click();await page.getByLabel("Goal name").fill("Become debt free");await page.getByLabel("Metric").selectOption("DEBT_REDUCTION");await page.getByLabel("Target",{exact:true}).fill("0");await page.getByRole("button",{name:"Set goal",exact:true}).click();await expect.poll(()=>goal).toMatchObject({goalType:"DEBT_REDUCTION",targetAmount:0});
 await page.getByRole("tab",{name:"Lifecycle"}).click();await page.getByLabel("Title",{exact:true}).fill("Policy review");await page.getByLabel("Expiry date",{exact:true}).fill("2027-09-01");await page.getByRole("button",{name:"Track deadline",exact:true}).click();await expect.poll(()=>deadline).toMatchObject({expiryDate:"2027-09-01",title:"Policy review"});expect(deadline).not.toHaveProperty("dueDate");
});
