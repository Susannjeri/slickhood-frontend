import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("My Wealth remains usable with incomplete legacy portfolio records", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_wealth"] });

  await page.route("**/wealth/dashboard**", route => route.fulfill({ json: envelope({
    summary: { currency: "", netWorth: null, totalAssetValue: null },
    assets: [null, {
      assetId: 7,
      name: "Legacy rental",
      assetType: "PROPERTY",
      currency: "",
      value: null,
      income: null,
      netOperatingIncome: null,
      totalUnits: null,
      arrears: null,
    }],
    obligations: [null],
    goals: null,
    goalProgress: null,
    insights: [null],
    projection: [null],
  }) }));
  await page.route("**/wealth/assets", route => route.fulfill({ json: envelope([null, {
    id: 7,
    assetType: "PROPERTY",
    name: "Legacy rental",
    currency: "",
    currentValue: null,
    status: "ACTIVE",
  }]) }));
  await page.route("**/wealth/property-options", route => route.fulfill({ json: envelope([null]) }));
  await page.route("**/wealth/assets/7/vault", route => route.fulfill({ json: envelope([null]) }));
  await page.route("**/wealth/assets/7/ledger", route => route.fulfill({ json: envelope({ valuations: [], cashFlows: [], liabilities: [], obligations: [], documents: [] }) }));

  await page.goto("/dashboard/wealth");

  await expect(page.getByRole("heading", { name: "Your financial command centre." })).toBeVisible();
  await expect(page.getByText("Legacy rental").first()).toBeVisible();
  await expect(page.getByText("Application error:")).toHaveCount(0);
});

test("vault metadata does not expose a download link until the owner opens it", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: ["view_wealth"] });
  let secureLinkRequests = 0;
  await page.route("**/wealth/dashboard**", route => route.fulfill({ json: envelope({
    summary: { currency: "KES" }, assets: [], obligations: [], goals: [], goalProgress: [], insights: [], projection: [],
  }) }));
  await page.route("**/wealth/assets", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/wealth/property-options", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/wealth/asset-types", route => route.fulfill({ json: envelope([
    { id: 1, code: "PROPERTY", label: "Property", displayOrder: 10, marketPricingAllowed: false, active: true },
  ]) }));
  await page.route("**/wealth/vault/9", route => {
    secureLinkRequests += 1;
    return route.fulfill({ json: envelope({
      document: { id: 9, category: "WILL", displayName: "will.pdf", contentType: "application/pdf", fileSize: 128, checksumSha256: "abc" },
      downloadUrl: "about:blank#protected-document",
    }) });
  });
  await page.route("**/wealth/vault", route => route.fulfill({ json: envelope([{
    document: { id: 9, category: "WILL", displayName: "will.pdf", contentType: "application/pdf", fileSize: 128, checksumSha256: "abc" },
    downloadUrl: null,
  }]) }));

  await page.goto("/dashboard/wealth");
  await page.getByRole("tab", { name: "Document vault" }).click();
  const documentButton = page.getByRole("button", { name: /^will\.pdf WILL/i });
  await expect(documentButton).toBeVisible();
  expect(secureLinkRequests).toBe(0);
  await documentButton.click();
  await expect.poll(() => secureLinkRequests).toBe(1);
});

test("My Wealth supports cash corrections, debt updates and ledger history", async ({ context, page }) => {
  await authenticated(context, page, { title: "AssetPortfolioManager", permissions: ["view_wealth","manage_wealth_assets","manage_wealth_finance","manage_wealth_compliance","manage_wealth_vault","manage_wealth_goals"] });
  const dashboard={summary:{currency:"KES",netWorth:7000000,totalAssetValue:10000000,totalDebt:3000000,annualIncome:1200000,annualExpenses:300000,netOperatingIncome:900000,annualDebtService:240000,cashFlow:660000,equity:7000000,portfolioYieldPercent:9,occupancyPercent:100,arrears:0,overdueDeadlines:0},assets:[{assetId:7,name:"Rental A",assetType:"PROPERTY",currency:"KES",value:10000000,debt:3000000,equity:7000000,income:1200000,expenses:300000,netOperatingIncome:900000,annualDebtService:240000,cashFlow:660000,rentalYieldPercent:9,appreciation:2000000,loanToValuePercent:30,concentrationPercent:100,totalUnits:4,occupiedUnits:4,occupancyPercent:100,arrears:0}],obligations:[],goals:[],goalProgress:[],insights:[],projection:[]};
  const ledger={valuations:[{id:21,assetId:7,amount:10000000,valuationDate:"2026-08-01",source:"OWNER_ESTIMATE"}],cashFlows:[{id:31,assetId:7,flowType:"INCOME",category:"RENT",amount:100000,entryDate:"2026-08-01",recurring:false}],liabilities:[{id:41,assetId:7,lender:"Test Bank",currency:"KES",originalPrincipal:4000000,outstandingPrincipal:3000000,monthlyPayment:20000}],obligations:[],documents:[]};
  let cashUpdated=false,debtUpdated=false;
  await page.route("**/wealth/dashboard**",route=>route.fulfill({json:envelope(dashboard)}));
  await page.route("**/wealth/assets",route=>route.fulfill({json:envelope([{id:7,assetType:"PROPERTY",name:"Rental A",currency:"KES",acquisitionCost:8000000,currentValue:10000000,valuationDate:"2026-08-01",status:"ACTIVE"}])}));
  await page.route("**/wealth/property-options",route=>route.fulfill({json:envelope([])}));
  await page.route("**/wealth/assets/7/ledger",route=>route.fulfill({json:envelope(ledger)}));
  await page.route("**/wealth/cash-flows/31",async route=>{cashUpdated=route.request().method()==="PUT";await route.fulfill({json:envelope({})})});
  await page.route("**/wealth/liabilities/41/balance",async route=>{debtUpdated=route.request().method()==="PUT";await route.fulfill({json:envelope({})})});

  await page.goto("/dashboard/wealth");
  await page.getByRole("tab",{name:"Income & debt"}).click();
  await expect(page.getByText("Test Bank")).toBeVisible();
  await page.getByRole("button",{name:"Correct"}).click();
  const correctionButton=page.getByRole("button",{name:"Save correction"});
  const correctionFormState=await correctionButton.evaluate(button=>({
    type:(button as HTMLButtonElement).type,
    valid:(button as HTMLButtonElement).form?.checkValidity(),
    connected:Boolean((button as HTMLButtonElement).form),
    invalid:Array.from((button as HTMLButtonElement).form?.elements??[])
      .filter(element=>element instanceof HTMLInputElement&&!element.checkValidity())
      .map(element=>({type:(element as HTMLInputElement).type,value:(element as HTMLInputElement).value,min:(element as HTMLInputElement).min,max:(element as HTMLInputElement).max,validationMessage:(element as HTMLInputElement).validationMessage})),
  }));
  expect(correctionFormState).toEqual({type:"submit",valid:true,connected:true,invalid:[]});
  await correctionButton.click();
  await expect.poll(()=>cashUpdated).toBeTruthy();
  await page.getByRole("button",{name:"Update"}).click();
  await page.getByRole("button",{name:"Save balance"}).click();
  await expect.poll(()=>debtUpdated).toBeTruthy();
  await expect(page.getByText("OWNER_ESTIMATE")).toBeVisible();
});

test("My Wealth maintains deadlines, vault records and goals", async ({ context, page }) => {
  await authenticated(context, page, { title: "AssetPortfolioManager", permissions: ["view_wealth","manage_wealth_compliance","manage_wealth_vault","manage_wealth_goals"] });
  const dashboard={summary:{currency:"KES",netWorth:1000000,totalAssetValue:1000000,totalDebt:0,annualIncome:0,annualExpenses:0,netOperatingIncome:0,annualDebtService:0,cashFlow:0,equity:1000000,portfolioYieldPercent:0,occupancyPercent:0,arrears:0,overdueDeadlines:0},assets:[{assetId:7,name:"Land A",assetType:"LAND",currency:"KES",value:1000000,debt:0,equity:1000000,income:0,expenses:0,netOperatingIncome:0,annualDebtService:0,cashFlow:0,rentalYieldPercent:0,appreciation:0,loanToValuePercent:0,concentrationPercent:100,totalUnits:0,occupiedUnits:0,occupancyPercent:0,arrears:0}],obligations:[],goals:[],goalProgress:[{goalId:71,name:"Net worth target",goalType:"NET_WORTH",targetAmount:2000000,currentAmount:1000000,progressPercent:50,targetDate:"2027-08-31"}],insights:[],projection:[]};
  const ledger={valuations:[],cashFlows:[],liabilities:[],obligations:[{id:51,assetId:7,obligationType:"LAND_RATES",title:"Annual land rates",dueDate:"2026-12-31",status:"OPEN"}],documents:[{document:{id:61,assetId:7,category:"TITLE",displayName:"Title deed.pdf",fileSize:1024,active:true},downloadUrl:"https://example.test/title"}]};
  let completed=false,documentArchived=false,goalArchived=false;
  await page.route("**/wealth/dashboard**",route=>route.fulfill({json:envelope(dashboard)}));
  await page.route("**/wealth/assets",route=>route.fulfill({json:envelope([{id:7,assetType:"LAND",name:"Land A",currency:"KES",currentValue:1000000,valuationDate:"2026-08-01",status:"ACTIVE"}])}));
  await page.route("**/wealth/property-options",route=>route.fulfill({json:envelope([])}));
  await page.route("**/wealth/assets/7/ledger",route=>route.fulfill({json:envelope(ledger)}));
  await page.route("**/wealth/obligations/51/complete",async route=>{completed=route.request().method()==="POST";await route.fulfill({json:envelope({})})});
  await page.route("**/wealth/vault/61",async route=>{documentArchived=route.request().method()==="DELETE";await route.fulfill({json:envelope({})})});
  await page.route("**/wealth/goals/71",async route=>{goalArchived=route.request().method()==="DELETE";await route.fulfill({json:envelope({})})});

  await page.goto("/dashboard/wealth");
  await page.getByRole("tab",{name:"Lifecycle"}).click();
  await page.getByRole("button",{name:"Complete"}).click();
  await expect.poll(()=>completed).toBeTruthy();
  await page.getByRole("tab",{name:"Document vault"}).click();
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Archive document"}).click();
  await expect.poll(()=>documentArchived).toBeTruthy();
  await page.getByRole("tab",{name:"Goals & projections"}).click();
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Archive goal"}).click();
  await expect.poll(()=>goalArchived).toBeTruthy();
});
