import {expect,test,Page} from "@playwright/test";
import {authenticated,envelope} from "./support";

const permissions=["view_wealth","manage_wealth_assets","manage_wealth_finance","manage_wealth_compliance","manage_wealth_goals","manage_wealth_vault"];
const categories=[{id:1,code:"CASH",label:"Cash & savings",displayOrder:10,marketPricingAllowed:false,active:true},{id:2,code:"PROPERTY",label:"Property",displayOrder:20,marketPricingAllowed:false,active:true}];
const assets=[{id:11,assetType:"CASH",name:"Savings",currency:"KES",currentValue:100,acquisitionCost:100,valuationDate:"2026-01-01",status:"ACTIVE",pricingMode:"MANUAL"},{id:12,assetType:"PROPERTY",name:"Family home",currency:"KES",currentValue:200,acquisitionCost:200,valuationDate:"2026-01-01",status:"ACTIVE",pricingMode:"MANUAL"}];
async function setup(page:Page){
 await page.route("**/wealth/assets",r=>r.fulfill({json:envelope(assets)}));
 await page.route("**/wealth/asset-types",r=>r.fulfill({json:envelope(categories)}));
 await page.route("**/wealth/property-options",r=>r.fulfill({json:envelope([])}));
 await page.route("**/wealth/vault",r=>r.fulfill({json:envelope([])}));
 await page.route("**/wealth/assets/*/ledger",r=>r.fulfill({json:envelope([{valuations:[],cashFlows:[],liabilities:[],obligations:[],documents:[]}])}));
 await page.route("**/wealth/dashboard**",r=>r.fulfill({json:envelope([{summary:{currency:"KES",netWorth:300,totalAssetValue:300,totalDebt:0,cashFlow:0},assets:assets.map(a=>({assetId:a.id,name:a.name,assetType:a.assetType,currency:a.currency,value:a.currentValue,totalUnits:0})),obligations:[],goals:[],goalProgress:[],projection:[],insights:[{code:"OVERDUE_COMPLIANCE",title:"Policy expired",severity:"HIGH",assetId:12,explanation:"Review the expired policy.",recommendedAction:"Resolve the deadline."}],advisor:{headline:"Review your records",completenessScore:60,nextBestActions:["Set a wealth goal so progress can be measured."]}}])}));
}

test("editing a goal uses its original currency rather than the converted dashboard amount",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);
 const targetDate="2030-01-01";let saved:unknown;
 await page.route("**/wealth/dashboard**",r=>r.fulfill({json:envelope([{summary:{currency:"KES",netWorth:300,totalAssetValue:300,totalDebt:0,cashFlow:0},assets:[],obligations:[],goals:[],goalProgress:[{goalId:8,name:"Dollar savings",goalType:"NET_WORTH",targetAmount:13000,currentAmount:300,progressPercent:2,targetDate}],projection:[],insights:[],advisor:{nextBestActions:[]}}])}));
 await page.route("**/wealth/goals/8",r=>{
   if(r.request().method()==="PUT"){saved=r.request().postDataJSON();return r.fulfill({json:envelope([])});}
   return r.fulfill({json:envelope([{id:8,name:"Dollar savings",goalType:"NET_WORTH",targetAmount:100,currency:"USD",targetDate,status:"ACTIVE"}])});
 });
 await page.goto("/dashboard/wealth#wealth-goals");await page.getByRole("button",{name:"Edit goal",exact:true}).click();
 await expect(page.getByLabel("Target",{exact:true})).toHaveValue("100");await expect(page.getByLabel("Goal currency")).toHaveValue("USD");
 await page.getByLabel("Target",{exact:true}).fill("150");await page.getByRole("button",{name:"Save goal changes"}).click();
 await expect(page.getByRole("button",{name:"Set goal",exact:true})).toBeVisible();expect(saved).toMatchObject({name:"Dollar savings",targetAmount:150,currency:"USD",targetDate});
});

test("summary cards and advisor actions open their working sections",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);await page.goto("/dashboard/wealth");
 await page.getByRole("button",{name:"Open outstanding debt",exact:true}).click();await expect(page.getByRole("tab",{name:"Income & debt",exact:true})).toHaveAttribute("aria-selected","true");await expect(page).toHaveURL(/#wealth-finance$/);
 await page.getByRole("button",{name:"Open deadlines",exact:true}).click();await expect(page.getByRole("tab",{name:"Lifecycle",exact:true})).toHaveAttribute("aria-selected","true");
 await page.getByRole("tab",{name:"Advisor",exact:true}).click();await page.getByRole("button",{name:"Set a wealth goal",exact:false}).click();await expect(page.getByRole("tab",{name:"Goals & projections",exact:true})).toHaveAttribute("aria-selected","true");await expect(page.getByText("Wealth goals",{exact:true})).toBeVisible();
});

test("asset performance and attention actions retain the selected asset",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);await page.goto("/dashboard/wealth");
 await page.getByRole("button",{name:"View history for Family home",exact:true}).click();await expect(page.getByLabel("Work on asset")).toHaveValue("12");
 await page.getByRole("tab",{name:"Advisor",exact:true}).click();await page.getByRole("button",{name:"Open lifecycle",exact:true}).click();await expect(page.getByLabel("Work on asset")).toHaveValue("12");
});

test("category shortcuts filter the register and prefill the asset category",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);await page.goto("/dashboard/wealth");
 await page.getByRole("button",{name:"View Property assets",exact:true}).click();await expect(page.getByLabel("Type",{exact:true})).toHaveValue("PROPERTY");await expect(page.getByLabel("Search assets")).toHaveValue("PROPERTY");await expect(page.getByText("Family home",{exact:true})).toBeVisible();await expect(page.getByText("Savings",{exact:true})).toHaveCount(0);
});

test("deep links, refresh and browser back preserve section navigation on mobile",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/dashboard/wealth#wealth-goals");
 await expect(page.getByRole("tab",{name:"Goals & projections",exact:true})).toHaveAttribute("aria-selected","true");await page.getByRole("tab",{name:"Document vault",exact:true}).click();await expect(page).toHaveURL(/#wealth-vault$/);
 await page.reload();await expect(page.getByText("Private document vault",{exact:true})).toBeVisible();await page.goBack();await expect(page.getByRole("tab",{name:"Goals & projections",exact:true})).toHaveAttribute("aria-selected","true");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

test("Wealth sidebar links open the specific selected section",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);await page.goto("/dashboard/wealth");
 await page.getByRole("link",{name:"Document vault",exact:true}).click();await expect(page.getByRole("tab",{name:"Document vault",exact:true})).toHaveAttribute("aria-selected","true");await expect(page).toHaveURL(/#wealth-vault$/);await expect(page.getByRole("link",{name:"Document vault",exact:true})).toHaveAttribute("data-active","true");
 await page.getByRole("link",{name:"Income & debt",exact:true}).click();await expect(page.getByText("Valuation history",{exact:true})).toBeVisible();
});

test("read-only users do not fetch property-linking data or gain mutation rights",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions:["view_wealth"]});await setup(page);let requests=0;
 await page.route("**/wealth/property-options",r=>{requests++;return r.fulfill({status:403,json:{description:"Denied"}});});
 await page.goto("/dashboard/wealth");await page.getByRole("button",{name:"Open asset value",exact:true}).click();await expect(page.getByRole("button",{name:"Add asset",exact:true})).toBeDisabled();expect(requests).toBe(0);await expect(page.getByText("Property linking is unavailable.",{exact:false})).toHaveCount(0);
});

test("private vault opens singleton-array links only after the owner clicks",async({context,page})=>{
 await authenticated(context,page,{title:"Landlord",permissions});await setup(page);let reads=0;
 await context.route("https://documents.slickhood.test/**",r=>r.fulfill({contentType:"text/html",body:"Private test document"}));
 await page.route("**/wealth/vault",r=>r.fulfill({json:envelope([{document:{id:9,category:"WILL",displayName:"will.pdf",contentType:"application/pdf",fileSize:128}}])}));
 await page.route("**/wealth/vault/9",r=>{reads++;return r.fulfill({json:envelope([{document:{id:9},downloadUrl:"https://documents.slickhood.test/will.pdf"}])});});
 await page.goto("/dashboard/wealth#wealth-vault");const button=page.getByRole("button",{name:/^will\.pdf WILL/});await expect(button).toBeVisible();expect(reads).toBe(0);const popup=page.waitForEvent("popup");await button.click();const opened=await popup;await expect(opened).toHaveURL("https://documents.slickhood.test/will.pdf");expect(reads).toBe(1);
});

test("admin reads real summary envelopes and edits catalogue labels without changing codes",async({context,page})=>{
 await authenticated(context,page,{title:"Superadmin",permissions:[]});let label="Cash & savings",saved:unknown;
 await page.route("**/wealth/admin/summary",r=>r.fulfill({json:envelope([{activeAssets:23,owners:8,vaultDocuments:14,marketPricedAssets:4,activeAssetTypes:2}])}));
 await page.route("**/wealth/admin/asset-types",r=>r.fulfill({json:envelope([{...categories[0],label}])}));
 await page.route("**/wealth/admin/asset-types/1",r=>{saved=r.request().postDataJSON();label="Savings & cash";return r.fulfill({json:envelope([])});});
 await page.goto("/dashboard/wealth-management");await expect(page.getByText("23",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Edit Cash & savings",exact:true}).click();await expect(page.getByLabel("Code",{exact:true})).toBeDisabled();await page.getByLabel("Customer label").fill("Savings & cash");await page.getByRole("button",{name:"Save asset type changes",exact:true}).click();await expect(page.getByText("Savings & cash",{exact:true})).toBeVisible();expect(saved).toMatchObject({code:"CASH",label:"Savings & cash",active:true});
 await page.getByRole("link",{name:"Asset catalogue",exact:true}).click();await expect(page).toHaveURL(/#wealth-type-catalogue$/);
});

test("admin totals failures are visible and retryable rather than showing zero",async({context,page})=>{
 await authenticated(context,page,{title:"Superadmin",permissions:[]});let requests=0;
 await page.route("**/wealth/admin/summary",r=>++requests===1?r.fulfill({status:503,json:{}}):r.fulfill({json:envelope([{activeAssets:23,owners:8}])}));await page.route("**/wealth/admin/asset-types",r=>r.fulfill({json:envelope(categories)}));
 await page.goto("/dashboard/wealth-management");await expect(page.getByRole("alert").filter({hasText:"Platform totals"})).toBeVisible();await expect(page.getByText("Active assets",{exact:true})).toHaveCount(0);await page.getByRole("button",{name:"Retry administration",exact:true}).click();await expect(page.getByText("23",{exact:true})).toBeVisible();
});
